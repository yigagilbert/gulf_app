# README.md
# Job Placement System

A comprehensive job placement and client management system built with FastAPI and React.

## Features

### Client Features
- **User Registration & Authentication**: Secure account creation and login
- **Profile Management**: Complete profile with personal, contact, and official details
- **Document Management**: Upload and manage documents (CV, passport, certificates, etc.)
- **Job Search**: Browse and search available job opportunities
- **Application Tracking**: Track job applications and their status
- **Status Monitoring**: Real-time status updates (new, verified, in progress, etc.)

### Admin Features
- **Client Management**: View, verify, and manage all registered clients
- **Document Verification**: Review and verify uploaded documents
- **Job Management**: Create and manage job opportunities
- **Download Documents**: Download client documents for review
- **Status Updates**: Update client statuses throughout the placement process
- **Analytics Dashboard**: Monitor system performance and metrics

## Technical Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **PostgreSQL**: Robust relational database
- **SQLAlchemy**: SQL toolkit and ORM
- **Pydantic**: Data validation using Python type annotations
- **JWT Authentication**: Secure token-based authentication
- **File Upload**: Support for document uploads with validation

### Frontend
- **React**: Modern JavaScript library for building user interfaces
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful, customizable icons
- **Responsive Design**: Mobile-first approach, works on all devices
- **Modern UI/UX**: Clean, professional interface

## Installation & Setup

### Backend Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd job-placement-system
```

2. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

3. **Set up PostgreSQL database**
```bash
# Using Docker (recommended)
docker-compose up -d postgres

# Or install PostgreSQL locally and create database
createdb jobplacement_db
```

4. **Configure environment variables**
Create a `.env` file:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/jobplacement_db
SECRET_KEY=your-super-secret-key-change-this-in-production
```

5. **Run the FastAPI server**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. **Install Node.js dependencies**
```bash
cd frontend
npm install
```

2. **Install Tailwind CSS**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

3. **Start the React development server**
```bash
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Database Schema

### Core Tables
- **users**: User authentication and roles
- **client_profiles**: Detailed client information
- **documents**: File storage and verification tracking
- **job_opportunities**: Available job positions
- **job_applications**: Application tracking

### Key Features
- **UUID Primary Keys**: Better security and scalability
- **Enum Types**: Consistent status and type management
- **Audit Trail**: Created/updated timestamps
- **File Metadata**: Comprehensive document tracking
- **Verification System**: Multi-step client verification process

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

### Profile Management
- `GET /profile/me` - Get current user profile
- `PUT /profile/me` - Update profile information

### Document Management
- `POST /documents/upload` - Upload documents
- `GET /documents/me` - Get user documents
- `GET /documents/download/{id}` - Download document

### Admin Endpoints
- `GET /admin/clients` - List all clients
- `PUT /admin/clients/{id}/verify` - Verify client
- `GET /admin/clients/{id}/documents` - Get client documents

### Job Management
- `GET /jobs` - List job opportunities
- `POST /jobs` - Create new job (admin only)

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Client/Admin role separation
- **File Validation**: Document type and size validation
- **Password Hashing**: Bcrypt password encryption
- **CORS Configuration**: Secure cross-origin requests
- **Input Validation**: Pydantic schema validation

## File Storage

- **Local Storage**: Files stored in `uploads/` directory
- **Unique Filenames**: UUID-based file naming
- **Metadata Tracking**: File size, type, and verification status
- **Download Protection**: Authenticated file access
- **File Type Validation**: Restricted file types for security

## Deployment Considerations

### Production Environment
1. **Environment Variables**: Set secure production values
2. **Database**: Use managed PostgreSQL service
3. **File Storage**: Consider cloud storage (AWS S3, etc.)
4. **SSL/HTTPS**: Enable secure connections
5. **Process Management**: Use PM2 or similar for Node.js
6. **Reverse Proxy**: Nginx for static files and load balancing

### Scaling Options
- **Database**: Read replicas, connection pooling
- **File Storage**: CDN for document delivery
- **Caching**: Redis for session management
- **Load Balancing**: Multiple application instances

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository or contact the development team.