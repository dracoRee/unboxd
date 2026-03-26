const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'main/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /let isFollowing = false;\n    if \(currentUserId\) {[\s\S]*?isFollowing = following\?\.following\?\.length > 0;\n    }\n    \n    \/\/ Construct response matching the expected format\n    const response = {[\s\S]*?isFollowing\n    };/g;

const match = content.match(regex);
if (match) {
  const replacement = `let isFollowing = false;
    let hasVouched = false;
    if (currentUserId) {
      // Query the relation to see if connection exists
      const following = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { 
          following: {
            where: { id: userId },
            select: { id: true }
          }
        }
      });
      isFollowing = following?.following?.length > 0;
      
      const vouch = await prisma.vouch.findUnique({
                                                    
                         
                             Use                             Use                      }
                             Use                
    // Construct response matching the expected format
    const response = {
      id: PublicUser.user.id,
      name: PublicUser.name,
      username: PublicUser.username,
      email: PublicUser.user.email,
      bio: PublicUser.bio,
      profilePicture: PublicUser.profilePicture,
               t:               t:               t:                             t:         cUser.user._count,
        listings: (PublicUser as any)._count.listings
      },
      isFollowing
    };`;
  content = content.replace(match[0], replacement);
  fs.writeFileSync(filePath, content);
  console.log("Patched user profile response in main/index.ts");
} else {
  console.log("Could not find regex match!");
}

