# Brumerie NestJS Backend

Architecture V2 avec :
- Messaging (Firebase/Firestore)
- Orders (Neon/PostgreSQL)
- Trust System (Reviews/Trust Scores)
- BullMQ Event Bus
- System Observability

## Structure

```
src/
├── dashboard/           # Health metrics & DLQ management
├── messages/           # Messaging module
├── orders/             # Orders module  
├── trust/              # Trust system
├── prisma/             # Database service
└── infrastructure/     # Event bus, logging
```

## Endpoints

- `GET /dashboard/health` - System health metrics
- `GET /dashboard/dlq` - Dead letter queue items
- `POST /dashboard/dlq/:id/replay` - Replay DLQ item

## Setup

```bash
npm install @nestjs/core @nestjs/common @prisma/client prisma bullmq firebase-admin
npx prisma generate
```