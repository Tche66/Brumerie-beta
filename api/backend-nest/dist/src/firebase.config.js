"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebaseAdmin = void 0;
const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
    });
}
exports.firebaseAdmin = admin;
//# sourceMappingURL=firebase.config.js.map