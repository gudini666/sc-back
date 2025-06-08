const express = require('express');
const router = express.Router();
const { uploadTrack, getLatestTracks, likeTrack, repostTrack, getTrackById, addComment } = require('../controllers/trackController');
const { required, optional } = require('../middleware/auth');

// Загрузка трека (требуется авторизация)
router.post('/upload', required, uploadTrack);

// Получение последних треков (опциональная авторизация)
router.get('/latest', optional, getLatestTracks);

// Получение трека по ID (опциональная авторизация)
router.get('/:trackId', optional, getTrackById);

// Лайк трека (требуется авторизация)
router.post('/:trackId/like', required, likeTrack);

// Репост трека (требуется авторизация)
router.post('/:trackId/repost', required, repostTrack);

// Добавление комментария (требуется авторизация)
router.post('/:trackId/comments', required, addComment);

module.exports = router; 