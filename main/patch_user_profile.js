const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'main/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldSelect = `        name: true,
        username: true,
        bio: true,
        profilePicture: true,
        isVerified: true,
        user: {`;
        
const newSelect = `        name: true,
        username: true,
        bio: true,
        profilePicture: true,
        isVerified: true,
        vouchCount: true,
        user: {`;

if (content.includes(oldSelect)) {
  content = content.replace(oldSelect, newSelect);
  console.log("Added vouchCount to select in /users/profile/:id");
}

fs.writeFileSync(filePath, content);
