import app from './app.js';
import { syncDB } from './models/index.js';

const PORT = process.env.PORT || 3000;

syncDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
});
