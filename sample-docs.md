# Sample Documentation

## Introduction

This is a sample documentation file to test the document indexing functionality.

## Getting Started

To get started with this project, follow these steps:

1. Install the dependencies
2. Set up the configuration
3. Run the application

### Installation

First, install the required packages:

```bash
npm install
```

### Configuration

Create a config file with the following settings:

```json
{
  "database": "sqlite://data.db",
  "port": 3000
}
```

## API Reference

### Authentication

All API requests require authentication via API key.

### Endpoints

#### GET /api/users

Returns a list of users.

**Parameters:**
- `limit` (optional): Maximum number of results
- `page` (optional): Page number for pagination

**Response:**
```json
{
  "users": [...],
  "total": 100,
  "page": 1
}
```

#### POST /api/users

Creates a new user.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check your database URL
   - Ensure the database server is running

2. **Authentication failures**
   - Verify your API key
   - Check the key expiration date

### Getting Help

If you need help, please:
- Check the FAQ section
- Open an issue on GitHub
- Contact support at support@example.com
