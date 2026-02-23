import { requestLogger } from './middleware/logger';
// 在其他中间件之前
app.use(requestLogger);
