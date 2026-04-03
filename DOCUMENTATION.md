# Tarot Jodorowsky Documentation

## Overview
The Tarot Jodorowsky application is a digital interpretation of Jodorowsky's tarot methodology. It provides users with intuitive tools to engage with tarot readings, giving insights and guidance through the cards. 

## Architecture
This application is built on a modular architecture that emphasizes scalability and maintainability. The key components include:
- **Frontend**: Developed using React.js, it provides a dynamic and responsive user interface. Components are structured to promote reusability.
- **Backend**: The server-side logic is implemented in Node.js, managing the business logic and database interactions. It exposes RESTful APIs for the frontend.
- **Database**: A NoSQL database (MongoDB) is used to store user data, card interpretations, and session histories.

## Features
- **User Authentication**: Secure user login and registration.
- **Tarot Reading**: Users can select cards and receive interpretations based on Jodorowsky's methodology.
- **History Log**: Users can review their past readings.
- **Customization**: Ability to customize tarot spreads and save personal notes.

## API Integration
The application leverages several external APIs to enhance functionality:
- **Card Database API**: Fetches card meanings and images.
- **User Data API**: Handles all user-related operations such as registration, authentication, and retrieval of user histories.

Endpoints include:
- `POST /api/auth/register`: Register a new user.
- `POST /api/auth/login`: User login.
- `GET /api/cards`: Retrieve tarot card information.

## Testing
Testing strategies include:
- **Unit Testing**: Utilizes Jest for testing individual functions and components.
- **Integration Testing**: Ensures that modules interact as expected.
- **End-To-End Testing**: Tools like Cypress are used to validate user workflows from the frontend to the backend.

To run tests, execute:
```bash
npm test
```

## Usage
1. **Installation**: Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/Nikoju1977/tarot-de-niko.git
   cd tarot-de-niko
   npm install
   ```
2. **Start the Development Server**:
   ```bash
   npm run start
   ```
3. **Access the Application**: Open your browser and navigate to `http://localhost:3000`.
4. **Perform Readings**: Log in and start exploring tarot readings according to Jodorowsky's method.

## Conclusion
The Tarot Jodorowsky application serves as a unique tool for both enthusiasts and those new to tarot. Its comprehensive features and user-friendly design provide an engaging way to explore tarot readings. Contributions and feedback are always welcome!