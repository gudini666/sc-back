// const express = require('express');
// const cors = require('cors');
// const fileUpload = require('express-fileupload');
// const path = require('path');
// const authRoutes = require('./routes/authRoutes');
// const trackRoutes = require('./routes/trackRoutes');
// const userRoutes = require('./routes/userRoutes');

// const app = express();

// // CORS configuration
// app.use(cors({
//   origin: ['http://82.202.128.126:3000', 'http://localhost:3000'],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   exposedHeaders: ['Content-Type', 'Authorization']
// }));

// // Middleware
// app.use(express.json());
// app.use(fileUpload({
//   createParentPath: true,
//   limits: {
//     fileSize: 50 * 1024 * 1024 // 50MB max file size
//   }
// }));

// // Serve static files from uploads directory
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/tracks', trackRoutes);
// app.use('/api/users', userRoutes);

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error('Global error handler:', err);
//   res.status(500).json({
//     success: false,
//     message: 'Внутренняя ошибка сервера: ' + err.message
//   });
// });

// module.exports = app; 