import express from 'express';

const app = express();
const port = 3000;

app.listen(port, () => {
    console.log(`Example app running on http://localhost:${port}`)
});

app.get('/', (req, res) => {
    res.send('Backend is up and running');
});

app.get('/health', (req, res) => {
    res.send("API is healthy");
});