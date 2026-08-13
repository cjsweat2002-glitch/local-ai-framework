CREATE TABLE `development_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` varchar(32) NOT NULL,
	`level` varchar(16) NOT NULL DEFAULT 'info',
	`title` varchar(180) NOT NULL,
	`detail` text NOT NULL,
	`source` varchar(48) NOT NULL DEFAULT 'workspace',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `development_activities_id` PRIMARY KEY(`id`)
);
