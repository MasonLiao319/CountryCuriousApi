import bcrypt from 'bcrypt';

// Function to hash passwords
async function hashPassword(plaintextPassword) {
  const hash = await bcrypt.hash(plaintextPassword, 10);
  console.log(hash);
  return hash;
}

// Function to compare passwords
async function comparePassword(plaintextPassword, hash) {
  return await bcrypt.compare(plaintextPassword, hash);
}


export { hashPassword, comparePassword };

