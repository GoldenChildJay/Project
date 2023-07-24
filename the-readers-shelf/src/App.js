// app.js

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const axios = require('axios');
const dotenv = require('dotenv');
const MongoDBStore = require('connect-mongodb-session')(session);


// Load environment variables from .env file
dotenv.config();

const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB database');
 });


 // Load the User model
const User = require('./models/user');

// Configure session store
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI,
  collection: 'sessions',

 // Catch errors for the session store
 store.on('error', function (error) {
    console.error('Session Store Error:', error);
  });
  
  
  // Set up session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: store,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    })
  );
  
  // Parse incoming JSON data
  app.use(express.json());
  
  // User Registration
  app.post('/register', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create a new user in the database
      const user = new User({
        username: username,
        password: hashedPassword,
      });
  
      await user.save();
  
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error registering user' });
    }
  });
  
  // User Login
  app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      // Find the user by username
      const user = await User.findOne({ username });
  
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
  
      // Compare the provided password with the hashed password in the database
      const isPasswordValid = await bcrypt.compare(password, user.password);
  
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
  
      // Save the user's id in the session to maintain user login state
      req.session.userId = user._id;
  
      res.status(200).json({ message: 'Login successful' });
    } catch (error) {
      res.status(500).json({ error: 'Error logging in' });
    }
  });
  
  // Protected Route Example
  app.get('/protected', (req, res) => {
    // Check if user is authenticated by checking the session
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
  
    res.json({ message: 'This is a protected route' });
  });


  // Search Books by Title, Author, or Genre
app.get('/search', async (req, res) => {
    const { query, type } = req.query;
  
    try {
      // Query the external book API based on user input
      const response = await axios.get(
        `https://api.example.com/books?q=${query}&type=${type}`
      );
  
      const books = response.data;
  
      res.json(books);
    } catch (error) {
      res.status(500).json({ error: 'Error searching for books' });
    }
  });
  
  // Add Book Recommendation
  app.post('/recommend', async (req, res) => {
    const { title, author, description, rating } = req.body;
  
    try {
      // Create a new book recommendation in the database
      const bookRecommendation = new Book({
        title: title,
        author: author,
        description: description,
        rating: rating,
      });
  
      await bookRecommendation.save();
  
      res.status(201).json({ message: 'Book recommendation added successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error adding book recommendation' });
    }
  });


  // Get Book Details by Book ID
app.get('/book/:bookId', async (req, res) => {
    const { bookId } = req.params;
  
    try {
      // Fetch book details from the database using the bookId
      const book = await Book.findById(bookId);
  
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
  
      // Calculate the average rating
      const totalRatings = book.ratings.length;
      const averageRating =
        totalRatings > 0 ? book.ratings.reduce((sum, rating) => sum + rating, 0) / totalRatings : 0;
  
      res.json({ ...book._doc, avgRating: averageRating });
    } catch (error) {
      res.status(500).json({ error: 'Error getting book details' });
    }
  });
  
  // User Rating Submission
  app.post('/rateBook', async (req, res) => {
    const { bookId, rating } = req.body;
  
    try {
      // Find the book by ID
      const book = await Book.findById(bookId);
  
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
  
      // Update the book's ratings array with the new rating
      book.ratings.push(rating);
  
      // Save the updated book with the new rating
      await book.save();
  
      // Calculate the average rating
      const totalRatings = book.ratings.length;
      const averageRating =
        totalRatings > 0 ? book.ratings.reduce((sum, rating) => sum + rating, 0) / totalRatings : 0;
  
      res.json({ ...book._doc, avgRating: averageRating });
    } catch (error) {
      res.status(500).json({ error: 'Error submitting rating' });
    }
  });

  

  



// Like Book Recommendation
app.post('/like', async (req, res) => {
    const { bookId } = req.body;
  
    try {
      // Find the book by ID
      const book = await Book.findById(bookId);
  
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
  
      // Increment the like count for the book recommendation
      book.likes += 1;
  
      // Save the updated book with the incremented like count
      await book.save();
  
      res.json({ message: 'Book recommendation liked!' });
    } catch (error) {
      res.status(500).json({ error: 'Error liking book recommendation' });
    }
  });
  

  
  // Personalized Recommendations Feed
  app.get('/personalizedRecommendations/:userId', async (req, res) => {
    const { userId } = req.params;
  
    try {
      // Fetch user preferences and interactions from the database
      const user = await User.findById(userId);
      const favoriteGenres = user.favoriteGenres;
      const favoriteAuthors = user.favoriteAuthors;
      const followedUsers = user.followedUsers;
  
      // Query the database to get book recommendations based on user preferences and interactions
      const personalizedRecommendations = await Book.find({
        $or: [
          { genre: { $in: favoriteGenres } },
          { author: { $in: favoriteAuthors } },
          { postedBy: { $in: followedUsers } },
        ],
      }).sort('-likes'); // You can use other sorting criteria as well, like most recent recommendations
  
      res.json(personalizedRecommendations);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching personalized recommendations' });
    }
  });
  
  

  


// Other app configuration and routes can be added here.

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
