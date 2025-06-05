const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs').promises;

// Загрузка трека
exports.uploadTrack = async (req, res) => {
  try {
    console.log('Received files:', req.files);
    console.log('Received body:', req.body);
    console.log('User:', req.user);

    const { title, description, genre } = req.body;
    const audioFile = req.files?.audio;
    const coverFile = req.files?.cover;
    const userId = req.user.id;

    if (!userId) {
      console.log('No user ID provided');
      return res.status(401).json({ message: 'Требуется авторизация' });
    }

    if (!audioFile) {
      console.log('No audio file provided');
      return res.status(400).json({ message: 'Аудиофайл обязателен' });
    }

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Создаем директории, если они не существуют
    const uploadsDir = path.join(__dirname, '../../uploads');
    const audioDir = path.join(uploadsDir, 'audio');
    const coversDir = path.join(uploadsDir, 'covers');

    console.log('Creating directories:', { uploadsDir, audioDir, coversDir });

    await fs.mkdir(audioDir, { recursive: true });
    await fs.mkdir(coversDir, { recursive: true });

    // Генерируем уникальные имена файлов
    const audioFileName = `${Date.now()}-${audioFile.name}`;
    const coverFileName = coverFile ? `${Date.now()}-${coverFile.name}` : null;

    console.log('Generated filenames:', { audioFileName, coverFileName });

    // Сохраняем файлы
    const audioPath = path.join(audioDir, audioFileName);
    console.log('Saving audio file to:', audioPath);
    await audioFile.mv(audioPath);

    if (coverFile) {
      const coverPath = path.join(coversDir, coverFileName);
      console.log('Saving cover file to:', coverPath);
      await coverFile.mv(coverPath);
    }

    // Создаем запись в базе данных
    const trackData = {
      title,
      description,
      genre,
      audioUrl: `/uploads/audio/${audioFileName}`,
      coverUrl: coverFileName ? `/uploads/covers/${coverFileName}` : null,
      userId
    };

    console.log('Creating track in database:', trackData);

    const track = await prisma.track.create({
      data: trackData,
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    console.log('Track created successfully:', track);

    res.status(201).json({
      success: true,
      data: track
    });
  } catch (error) {
    console.error('Error uploading track:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при загрузке трека: ' + error.message
    });
  }
};

exports.likeTrack = async (req, res) => {
  try {
    const { trackId } = req.params;
    const userId = req.user.id;

    // Проверяем существование трека
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        },
        likes: true,
        reposts: true
      }
    });

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Трек не найден'
      });
    }

    // Проверяем, не лайкнул ли уже пользователь этот трек
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_trackId: {
          userId,
          trackId
        }
      }
    });

    if (existingLike) {
      // Если лайк уже есть, удаляем его
      await prisma.like.delete({
        where: {
          id: existingLike.id
        }
      });

      return res.json({
        success: true,
        data: {
          liked: false,
          track: {
            ...track,
            likesCount: track.likes.length - 1,
            repostsCount: track.reposts.length,
            isLiked: false,
            isReposted: track.reposts.some(repost => repost.userId === userId),
            user: track.user,
            likes: undefined,
            reposts: undefined
          }
        }
      });
    }

    // Создаем новый лайк
    const like = await prisma.like.create({
      data: {
        userId,
        trackId
      }
    });

    res.json({
      success: true,
      data: {
        liked: true,
        track: {
          ...track,
          likesCount: track.likes.length + 1,
          repostsCount: track.reposts.length,
          isLiked: true,
          isReposted: track.reposts.some(repost => repost.userId === userId),
          user: track.user,
          likes: undefined,
          reposts: undefined
        }
      }
    });
  } catch (error) {
    console.error('Like track error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обработке лайка'
    });
  }
};

exports.repostTrack = async (req, res) => {
  try {
    const { trackId } = req.params;
    const userId = req.user.id;

    // Проверяем существование трека
    const track = await prisma.track.findUnique({
      where: { id: trackId }
    });

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Трек не найден'
      });
    }

    // Проверяем, не репостнул ли уже пользователь этот трек
    const existingRepost = await prisma.repost.findUnique({
      where: {
        userId_trackId: {
          userId,
          trackId
        }
      }
    });

    if (existingRepost) {
      // Если репост уже есть, удаляем его
      await prisma.repost.delete({
        where: {
          id: existingRepost.id
        }
      });

      return res.json({
        success: true,
        data: { reposted: false }
      });
    }

    // Создаем новый репост
    const repost = await prisma.repost.create({
      data: {
        userId,
        trackId
      }
    });

    res.json({
      success: true,
      data: { reposted: true }
    });
  } catch (error) {
    console.error('Repost track error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обработке репоста'
    });
  }
};

// Обновляем метод getLatestTracks, чтобы включить информацию о лайках и репостах
exports.getLatestTracks = async (req, res) => {
  try {
    console.log('Getting latest tracks...');
    const userId = req.user?.id; // Может быть undefined, если пользователь не авторизован
    console.log('User ID:', userId);

    const tracks = await prisma.track.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        },
        likes: userId ? {
          where: {
            userId: userId
          }
        } : false,
        _count: {
          select: {
            likes: true,
            reposts: true
          }
        }
      }
    });

    console.log('Found tracks:', tracks.length);

    // Преобразуем данные для фронтенда
    const formattedTracks = tracks.map(track => ({
      ...track,
      likesCount: track._count.likes,
      repostsCount: track._count.reposts,
      isLiked: userId ? track.likes.length > 0 : false,
      isReposted: false, // Пока не реализовано
      likes: undefined, // Удаляем массив лайков
      _count: undefined // Удаляем счетчики
    }));

    console.log('Sending response with tracks');
    res.json({
      success: true,
      data: formattedTracks
    });
  } catch (error) {
    console.error('Get latest tracks error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении последних треков: ' + error.message
    });
  }
};

exports.getTrackById = async (req, res) => {
  try {
    const { trackId } = req.params;
    const userId = req.user?.id;

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        },
        likes: {
          where: { userId }
        },
        reposts: {
          where: { userId }
        },
        comments: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            reposts: true,
            comments: true
          }
        }
      }
    });

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Трек не найден'
      });
    }

    const formattedTrack = {
      ...track,
      isLiked: track.likes.length > 0,
      isReposted: track.reposts.length > 0,
      likesCount: track._count.likes,
      repostsCount: track._count.reposts,
      likes: undefined,
      reposts: undefined,
      _count: undefined
    };

    res.json({
      success: true,
      data: formattedTrack
    });
  } catch (error) {
    console.error('Error in getTrackById:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении трека: ' + error.message
    });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { trackId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Текст комментария обязателен'
      });
    }

    const track = await prisma.track.findUnique({
      where: { id: trackId }
    });

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Трек не найден'
      });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        trackId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Error in addComment:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при добавлении комментария: ' + error.message
    });
  }
}; 