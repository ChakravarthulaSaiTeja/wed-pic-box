# Wedding Memories - Photo Sharing Application

A comprehensive wedding photo-sharing web application that allows wedding guests to share memories seamlessly while providing hosts with powerful management tools.

## 🌟 Features

### Guest Experience (No Registration Required)
- **QR Code Access**: Instant access to event pages via QR codes
- **Multi-file Upload**: Direct photo/video uploads from mobile devices with drag-and-drop
- **Digital Guestbook**: Text messages and audio recordings
- **Real-time Slideshow**: Auto-updating photo slideshow
- **Social Features**: Like and comment on shared content
- **Fully Responsive**: Works on all device types

### Host Admin Dashboard
- **Secure Authentication**: JWT-based authentication system
- **Event Management**: Create events with custom branding
- **QR Code Generation**: Generate access QR codes for guests
- **Media Organization**: Custom albums (Ceremony, Reception, etc.)
- **Content Moderation**: Approve/delete inappropriate content
- **Privacy Controls**: Password protection and access controls
- **Bulk Operations**: Download all event content

### Technical Features
- **Real-time Updates**: WebSocket implementation for live updates
- **Cloud Storage**: Cloudinary integration for media storage
- **Performance Optimized**: Image compression and lazy loading
- **Security**: Input validation, CSRF protection, rate limiting
- **Mobile-first Design**: Responsive UI with wedding aesthetics
- **Accessibility**: WCAG 2.1 compliant design

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Cloudinary account (for file storage)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd wedding-memories
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/wedding-memories

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

4. **Start the application**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

5. **Access the application**
- Open your browser to `http://localhost:3000`
- Create an admin account to start managing events

## 📁 Project Structure

```
wedding-memories/
├── server.js                 # Main server file
├── package.json             # Dependencies and scripts
├── .env.example            # Environment variables template
│
├── models/                 # Database models
│   ├── User.js            # User authentication
│   ├── Event.js           # Wedding events
│   ├── Media.js           # Photos and videos
│   └── Guestbook.js       # Guest messages
│
├── routes/                # API routes
│   ├── auth.js           # Authentication endpoints
│   ├── events.js         # Event management
│   ├── media.js          # Media upload/management
│   ├── guestbook.js      # Guestbook functionality
│   └── qr.js             # QR code generation
│
├── middleware/            # Express middleware
│   ├── auth.js           # Authentication middleware
│   └── errorHandler.js   # Error handling
│
├── utils/                # Utility functions
│   └── cloudinary.js    # File upload utilities
│
└── public/               # Frontend files
    ├── index.html        # Main HTML file
    ├── css/              # Stylesheets
    ├── js/               # JavaScript modules
    └── images/           # Static images
```

## 🔧 Configuration

### Cloudinary Setup
1. Create a free account at [Cloudinary](https://cloudinary.com)
2. Get your Cloud Name, API Key, and API Secret from the dashboard
3. Add these to your `.env` file

### MongoDB Setup
**Local MongoDB:**
```bash
# Install MongoDB
# macOS
brew install mongodb-community

# Ubuntu
sudo apt-get install mongodb

# Start MongoDB
mongod
```

**MongoDB Atlas (Cloud):**
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a cluster and get connection string
3. Update `MONGODB_URI` in `.env`

## 🎨 Customization

### Themes and Styling
- Modify CSS variables in `public/css/styles.css`
- Customize color schemes for different wedding themes
- Update fonts and typography

### Event Configuration
```javascript
// Default albums created for each event
const defaultAlbums = [
  'All Photos',
  'Ceremony', 
  'Reception',
  'Portraits',
  'Candid'
];
```

## 📱 Mobile Features

### Photo Upload
- Drag and drop interface
- Camera integration on mobile devices
- Progress indicators for uploads
- Automatic image optimization

### Audio Messages
- Browser-based audio recording
- WebRTC API for microphone access
- Compressed audio storage

## 🔐 Security Features

### Authentication
- JWT tokens with refresh mechanism
- Secure password hashing (bcrypt)
- Session management

### Authorization
- Role-based access control (host, photographer, admin)
- Event-specific permissions
- Password-protected events

### Data Protection
- Input validation and sanitization
- Rate limiting on API endpoints
- CSRF protection
- Secure file upload validation

## 🚀 Deployment

### Production Environment Variables
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/wedding-memories
JWT_SECRET=generate-a-secure-random-string
SESSION_SECRET=generate-another-secure-random-string
```

### Deployment Options

#### 1. Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-connection-string
# ... add all other environment variables

# Deploy
git push heroku main
```

#### 2. DigitalOcean / VPS
```bash
# On your server
git clone <your-repo>
cd wedding-memories
npm install --production

# Install PM2 for process management
npm install -g pm2

# Start application
pm2 start server.js --name "wedding-memories"
pm2 startup
pm2 save

# Setup Nginx reverse proxy
sudo nano /etc/nginx/sites-available/wedding-memories
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. Docker
```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Analytics and Monitoring

### Built-in Analytics
- Event statistics (photos, videos, likes, comments)
- QR code scan tracking
- User engagement metrics

### External Monitoring
- Add Google Analytics for visitor tracking
- Implement error tracking (Sentry)
- Monitor performance with New Relic

## 🔧 Maintenance

### Database Backup
```bash
# MongoDB backup
mongodump --uri="your-mongodb-connection-string" --out=backup/$(date +%Y%m%d)
```

### Log Management
```bash
# View PM2 logs
pm2 logs wedding-memories

# Rotate logs
pm2 install pm2-logrotate
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues

**File Upload Issues:**
- Check Cloudinary credentials
- Verify file size limits
- Ensure proper CORS configuration

**Authentication Problems:**
- Verify JWT secret configuration
- Check token expiration settings
- Ensure HTTPS in production

**Database Connection:**
- Verify MongoDB connection string
- Check network connectivity
- Ensure database permissions

### Getting Help
- Create an issue on GitHub
- Check the documentation
- Review the console logs for errors

## 🎉 Features Roadmap

- [ ] Email notifications for new uploads
- [ ] Advanced search and filtering
- [ ] Face recognition for auto-tagging
- [ ] Social media integration
- [ ] Print ordering functionality
- [ ] Mobile app development
- [ ] Video streaming optimization
- [ ] Multi-language support

---

**Happy Wedding Planning! 💒✨**
