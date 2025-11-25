// Quick test to see if the pattern matching logic is correct
const conversationId = 'dm_E7UStXuqx1dZdJOpd9uT5utnQsy1';
const uid = 'E7UStXuqx1dZdJOpd9uT5utnQsy1';

// Test the pattern matching
const pattern1 = conversationId === 'dm_' + uid;
const pattern2 = conversationId === 'dm__' + uid;

console.log('Conversation ID:', conversationId);
console.log('User UID:', uid);
console.log('Pattern 1 (dm_):', pattern1);
console.log('Pattern 2 (dm__):', pattern2);
console.log('Should match:', pattern1 || pattern2);
