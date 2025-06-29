require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Game = require('./models/Game');

async function setupDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create default admin user if it doesn't exist
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const admin = new User({
        username: 'admin',
        email: 'admin@codearena.dev',
        displayName: 'CodeArena Admin',
        password: 'admin123', // Change this in production!
        provider: 'local',
        role: 'admin',
        isVerified: true
      });
      await admin.save();
      console.log('✅ Created default admin user');
      console.log('   Email: admin@codearena.dev');
      console.log('   Password: admin123');
      console.log('   ⚠️  Please change the password after first login!');
    }

    // Create default games
    const gamesData = [
      {
        name: 'Tic Tac Toe',
        description: 'Classic 3x3 grid game. Get three in a row to win!',
        difficulty: 'Easy',
        icon: '⭕',
        color: 'green',
        maxPlayers: 2,
        minPlayers: 2,
        timeLimit: 5,
        rules: 'Players take turns placing X or O on a 3x3 grid. First to get three in a row wins.',
        apiEndpoint: '/api/games/tictactoe',
        tags: ['classic', 'strategy', 'beginner']
      },
      {
        name: 'Connect Four',
        description: 'Drop pieces to get four in a row vertically, horizontally, or diagonally.',
        difficulty: 'Medium',
        icon: '🔴',
        color: 'blue',
        maxPlayers: 2,
        minPlayers: 2,
        timeLimit: 10,
        rules: 'Players drop colored pieces into a 7x6 grid. First to connect four pieces wins.',
        apiEndpoint: '/api/games/connect4',
        tags: ['classic', 'strategy']
      },
      {
        name: 'Chess',
        description: 'The ultimate strategy game. Checkmate your opponent to win.',
        difficulty: 'Expert',
        icon: '♟️',
        color: 'purple',
        maxPlayers: 2,
        minPlayers: 2,
        timeLimit: 30,
        rules: 'Classic chess rules apply. Checkmate the opponent\'s king to win.',
        apiEndpoint: '/api/games/chess',
        tags: ['classic', 'strategy', 'expert']
      },
      {
        name: 'Snake Battle',
        description: 'Multi-player snake game. Eat food, avoid walls and other snakes!',
        difficulty: 'Medium',
        icon: '🐍',
        color: 'orange',
        maxPlayers: 4,
        minPlayers: 2,
        timeLimit: 15,
        rules: 'Control a snake to eat food and grow. Last snake standing wins.',
        apiEndpoint: '/api/games/snake',
        tags: ['action', 'multiplayer', 'arcade']
      },
      {
        name: 'Rock Paper Scissors',
        description: 'Best of 5 rounds. Rock beats scissors, scissors beats paper, paper beats rock.',
        difficulty: 'Easy',
        icon: '✂️',
        color: 'yellow',
        maxPlayers: 2,
        minPlayers: 2,
        timeLimit: 3,
        rules: 'Choose rock, paper, or scissors. Best of 5 rounds wins.',
        apiEndpoint: '/api/games/rps',
        tags: ['classic', 'simple', 'quick']
      }
    ];

    for (const gameData of gamesData) {
      const existingGame = await Game.findOne({ name: gameData.name });
      if (!existingGame) {
        const admin = await User.findOne({ role: 'admin' });
        const game = new Game({
          ...gameData,
          createdBy: admin._id
        });
        await game.save();
        console.log(`✅ Created game: ${gameData.name}`);
      }
    }

    console.log('🎉 Database setup completed successfully!');
    
    // Display summary
    const userCount = await User.countDocuments();
    const gameCount = await Game.countDocuments();
    
    console.log('\n📊 Database Summary:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Games: ${gameCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;