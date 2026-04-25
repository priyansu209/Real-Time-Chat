# Demo: #https://drive.google.com/file/d/1YprjYkwFP1FZebE8gCe-dziEEipd802O/view?usp=sharing
# Real-Time AI-Powered Chat Application

A modern, real-time chat application built with **Spring Boot** (Backend) and **React + Vite** (Frontend). It features secure private messaging via WebSockets, persistent chat history in MongoDB, JWT authentication, and AI-powered chat assistance using the Hugging Face API (Mistral).

## Quick Start Guide

Follow these five easy steps to get the application up and running on your local machine. You can copy and paste the blocks below.

### 1. Clone the repository

```bash
git clone https://github.com/priyansu209/Real-Time-Chat.git
cd Real-Time-Chat
```

### 2. Start the Database (MongoDB)

You need to have MongoDB running locally on port 27017. If you have Docker installed, you can quickly spin up a MongoDB instance using the following command:

```bash
docker run -d -p 27017:27017 --name mongodb mongo
```
> If you have MongoDB installed locally, you can simply ensure the MongoDB service is running and skip the Docker command.

### 3. Configure the Backend

The backend expects you to set down some critical configuration properties (like the Hugging Face API key for AI features and the JWT secret). Create or modify the `application.properties` in `backend/src/main/resources/` directory:

```properties
spring.application.name=backend
server.port=8080
spring.data.mongodb.uri=mongodb://localhost:27017/realtime_chat
jwt.secret=5367566B59703373367639792F423F4528482B4D6251655468576D5A71347437
jwt.expiration=86400000
huggingface.api.key=hf_YOUR_API_KEY_HERE
huggingface.api.url=https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2
```

### 4. Run the Backend

Open a new terminal, navigate to the `backend` folder, and clean-install your dependencies, then run the Spring Boot server:

```bash
cd backend
./mvnw clean install
./mvnw spring-boot:run
```
> Note: On Windows Command Prompt, use `mvnw` instead of `./mvnw`.

### 5. Run the Frontend

Open another terminal, navigate to the `frontend` folder, install Node dependencies, and start the Vite development server:

```bash
cd frontend
npm install
npm run dev
```

## Tech Stack Overview

**Backend**: Java 17, Spring Boot, Spring Security (JWT), Spring Data MongoDB, Spring WebSockets (STOMP)
**Frontend**: React 18, Vite, React Router, Axios, SockJS & STOMP client
**Database**: MongoDB
**AI Engine**: Hugging Face Inference API (Mistral-7B)
