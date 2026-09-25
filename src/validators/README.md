# validators/

Joi schemas for every inbound HTTP payload (Creatio API calls, webhook
registration/inbound Jira webhooks, admin endpoints). Applied via
`middleware/validate.js` before a request reaches a controller.
