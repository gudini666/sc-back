const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    console.log('Getting user by username:', username);
    console.log('Auth user:', req.user);
    const userId = req.user?.id;

    // Проверяем, что username передан
    if (!username) {
      console.log('Username is missing');
      return res.status(400).json({
        success: false,
        message: 'Имя пользователя не указано'
      });
    }

    // Ищем пользователя
    console.log('Searching for user in database...');
    const user = await prisma.user.findUnique({
      where: {
        username: username
      },
      include: {
        tracks: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            likes: {
              select: {
                userId: true
              }
            },
            reposts: {
              select: {
                userId: true
              }
            }
          }
        },
        likes: {
          include: {
            track: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true
                  }
                },
                likes: {
                  select: {
                    userId: true
                  }
                },
                reposts: {
                  select: {
                    userId: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        reposts: {
          include: {
            track: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true
                  }
                },
                likes: {
                  select: {
                    userId: true
                  }
                },
                reposts: {
                  select: {
                    userId: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        followers: {
          include: {
            follower: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        following: {
          include: {
            following: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        _count: {
          select: {
            tracks: true,
            likes: true,
            reposts: true,
            followers: true,
            following: true,
            comments: true
          }
        }
      }
    });

    if (!user) {
      console.log('User not found:', username);
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    console.log('User found:', {
      id: user.id,
      username: user.username,
      tracksCount: user.tracks.length,
      likesCount: user.likes.length,
      repostsCount: user.reposts.length,
      stats: user._count
    });

    // Преобразуем данные для фронтенда
    const formattedUser = {
      ...user,
      isFollowing: user.followers.length > 0,
      followers: user.followers.map(f => ({
        id: f.follower.id,
        username: f.follower.username
      })),
      following: user.following.map(f => ({
        id: f.following.id,
        username: f.following.username
      })),
      tracks: user.tracks.map(track => ({
        ...track,
        likesCount: track.likes.length,
        repostsCount: track.reposts.length,
        isLiked: userId ? track.likes.some(like => like.userId === userId) : false,
        isReposted: userId ? track.reposts.some(repost => repost.userId === userId) : false,
        user: {
          id: user.id,
          username: user.username
        },
        likes: undefined,
        reposts: undefined
      })),
      likedTracks: user.likes.map(like => ({
        ...like.track,
        likesCount: like.track.likes.length,
        repostsCount: like.track.reposts.length,
        isLiked: true,
        isReposted: userId ? like.track.reposts.some(repost => repost.userId === userId) : false,
        user: {
          id: like.track.user.id,
          username: like.track.user.username
        },
        likes: undefined,
        reposts: undefined
      })),
      repostedTracks: user.reposts.map(repost => ({
        ...repost.track,
        likesCount: repost.track.likes.length,
        repostsCount: repost.track.reposts.length,
        isLiked: userId ? repost.track.likes.some(like => like.userId === userId) : false,
        isReposted: true,
        user: {
          id: repost.track.user.id,
          username: repost.track.user.username
        },
        likes: undefined,
        reposts: undefined
      })),
      likes: undefined,
      reposts: undefined
    };

    console.log('Sending response with formatted user data');
    res.json({
      success: true,
      data: formattedUser
    });
  } catch (error) {
    console.error('Error in getUserByUsername:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении данных пользователя: ' + error.message
    });
  }
};

exports.toggleFollow = async (req, res) => {
  try {
    console.log('Toggle follow request received:', {
      params: req.params,
      user: req.user,
      headers: req.headers
    });

    const { username } = req.params;
    const currentUserId = req.user.id;

    // Находим пользователя, на которого хотим подписаться
    const userToFollow = await prisma.user.findUnique({
      where: { username },
      include: {
        followers: {
          where: { followerId: currentUserId }
        }
      }
    });

    if (!userToFollow) {
      console.log('User to follow not found:', username);
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    console.log('Found user to follow:', {
      id: userToFollow.id,
      username: userToFollow.username,
      followersCount: userToFollow.followers.length,
      isFollowing: userToFollow.followers.length > 0
    });

    // Проверяем, подписан ли уже текущий пользователь
    const isFollowing = userToFollow.followers.length > 0;

    if (isFollowing) {
      // Отписываемся
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userToFollow.id
          }
        }
      });
      console.log('Unfollowed user:', username);
    } else {
      // Подписываемся
      await prisma.follow.create({
        data: {
          followerId: currentUserId,
          followingId: userToFollow.id
        }
      });
      console.log('Followed user:', username);
    }

    // Получаем обновленные данные пользователя
    const updatedUser = await prisma.user.findUnique({
      where: { username },
      include: {
        _count: {
          select: {
            followers: true,
            following: true
          }
        },
        followers: {
          where: { followerId: currentUserId }
        }
      }
    });

    console.log('Updated user data:', {
      id: updatedUser.id,
      username: updatedUser.username,
      followersCount: updatedUser._count.followers,
      followingCount: updatedUser._count.following,
      isFollowing: updatedUser.followers.length > 0
    });

    res.json({
      success: true,
      data: {
        following: updatedUser.followers.length > 0,
        followersCount: updatedUser._count.followers,
        followingCount: updatedUser._count.following
      }
    });
  } catch (error) {
    console.error('Toggle follow error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при подписке/отписке: ' + error.message
    });
  }
}; 