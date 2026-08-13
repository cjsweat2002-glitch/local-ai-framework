CREATE TABLE `gemini_mirrors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` varchar(24) NOT NULL,
	`name` varchar(128) NOT NULL,
	`instructions` text,
	`notebookContent` text,
	`sourceUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gemini_mirrors_id` PRIMARY KEY(`id`)
);
