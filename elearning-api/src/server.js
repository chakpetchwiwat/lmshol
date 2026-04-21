require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const uploadRoutes = require('./routes/upload.routes');
const settingRoutes = require('./routes/setting.routes');
const goalRoutes = require('./routes/goal.routes');
const {
  buildCorsOptions,
  buildHelmetOptions,
  createDefaultApiLimiter,
  getSecurityConfig
} = require('./config/security');
const errorHandler = require('./middleware/error');
const { SERVER_DEFAULTS } = require('./utils/constants/config');

const app = express();
const securityConfig = getSecurityConfig();

app.set('trust proxy', securityConfig.trustProxy);

// Middleware
app.use(helmet(buildHelmetOptions()));
app.use(cors(buildCorsOptions(securityConfig)));
app.use(compression()); // Gzip all responses for smaller payloads
app.use(express.json({ limit: securityConfig.bodyLimits.json }));
app.use(express.urlencoded({ limit: securityConfig.bodyLimits.urlencoded, extended: true }));

// Serve uploaded files as static (Only for local development)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Basic Route for Testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to e-Learning API (Vercel Ready)' });
});

// API Routes
app.use('/api', createDefaultApiLimiter(securityConfig));
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/goals', goalRoutes);

// Error Handling Middleware (Centralized)
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || SERVER_DEFAULTS.DEFAULT_PORT;
try {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
} catch (e) {
  console.error('Failed to start server:', e);
}

module.exports = app;
