# CampusCapsule Backend

**The backend API for CampusCapsule — a shared digital archive for university memories.**

CampusCapsule is a mobile application designed to help university friends preserve their experiences, photos, and everyday moments in one private, shared space. This repository contains the backend REST API that powers the application.

The project is built with Node.js, Express, TypeScript, MongoDB, and Cloudinary.

## Features

- **Authentication:** User registration, login, JWT-based authentication, and token refresh.
- **Groups:** Create and manage private groups for university friends.
- **Invitations:** Invite friends to groups using invitation codes.
- **Memory Management:** Store and retrieve dated photo memories.
- **Image Uploads:** Upload and manage images using Cloudinary.
- **Database:** Store application data in MongoDB.
- **API Security:** Request validation, security headers, and configurable CORS.
- **REST API:** Organized routes, controllers, middleware, and utilities.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | REST API framework |
| TypeScript | Type-safe backend development |
| MongoDB Atlas | Cloud database |
| Mongoose | MongoDB object modeling |
| Cloudinary | Image storage |
| JWT | Authentication |
| Zod | Request validation |
| Helmet | HTTP security headers |

## Project Structure

```text
campuscapsule-backend/
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── utils/
│   └── server.ts
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── render.yaml
└── README.md
```

The exact contents of `src/` may evolve as the project develops.

## Getting Started

### Prerequisites

Before running the project locally, install or prepare:

- Node.js (LTS recommended)
- npm
- A MongoDB database, such as MongoDB Atlas
- A Cloudinary account for image uploads

### 1. Clone the repository

```bash
git clone https://github.com/AnusAfzal/campuscapsule-backend.git
cd campuscapsule-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file using the example:

```bash
cp .env.example .env
```

On Windows PowerShell, you can instead run:

```powershell
Copy-Item .env.example .env
```

Open `.env` and configure the required values. Do not commit this file to GitHub.

Typical configuration includes:

- `PORT` — API server port
- `NODE_ENV` — application environment
- `API_PREFIX` — API route prefix
- `MONGODB_URI` — MongoDB connection string
- `JWT_ACCESS_SECRET` — access-token signing secret
- `JWT_REFRESH_SECRET` — refresh-token signing secret
- Cloudinary credentials required by the application

Use `.env.example` as the source of truth for the exact variable names and required settings.

### 4. Run in development

```bash
npm run dev
```

The server uses the port configured in your environment variables, typically `5000` for local development.

### 5. Build the project

```bash
npm run build
```

### 6. Run the production build locally

```bash
npm start
```

### 7. Run type checking

```bash
npm run typecheck
```

## API

The API uses the `/api` prefix by default.

**Base URL (deployed backend):**

```text
https://campuscapsule-backend.onrender.com/api
```

### Health Check

```http
GET /api/health
```

Use this endpoint to check whether the deployed API is reachable.

### API Areas

The backend includes routes for the following areas:

| Area | Purpose |
|---|---|
| Authentication | Registration, login, current user, and token refresh |
| Users | User-related operations |
| Groups | Group creation and membership management |
| Invitations | Invitation lookup and joining groups |
| Memories | Creating and retrieving photo memories |

Consult the route files in `src/routes/` for the exact endpoints, HTTP methods, request bodies, and authentication requirements.

## Deployment

The backend is deployed using [Render](https://render.com/).

MongoDB Atlas is used for hosted database storage, while Cloudinary handles image storage.

To deploy your own instance:

1. Fork or clone this repository.
2. Create a web service on Render connected to your repository.
3. Configure the required environment variables in Render.
4. Ensure the MongoDB Atlas database user and network access settings permit the service to connect.
5. Configure Cloudinary credentials.
6. Deploy and verify the health endpoint.

Never commit production credentials or private environment files.

## Security

- Keep `.env` out of version control.
- Use strong, unique JWT secrets.
- Restrict database permissions to the minimum required.
- Configure CORS for the clients you intend to support.
- Never publish real credentials in documentation, issues, screenshots, or logs.
- Rotate any credentials that have been exposed.

## Contributing

Contributions, bug reports, and feature suggestions are welcome.

1. Fork the repository.
2. Create a branch for your change.
3. Make your changes and test them.
4. Submit a pull request describing the change.

For larger features, open an issue first to discuss the proposed implementation.

## License

This project is intended to be released under the MIT License. Once the `LICENSE` file has been added to this repository, its terms will govern use and distribution of the code.

## Author

**Anus Afzal**

GitHub: [@AnusAfzal](https://github.com/AnusAfzal)

## Related Project

The CampusCapsule mobile application repository will be linked here when it is published.

---

*CampusCapsule — Your University Life, Preserved Daily.*
