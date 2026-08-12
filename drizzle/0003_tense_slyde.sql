CREATE TABLE `provider_market_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(32) NOT NULL,
	`category` varchar(48) NOT NULL,
	`title` varchar(180) NOT NULL,
	`summary` text NOT NULL,
	`sourceUrl` varchar(1024),
	`relevanceScore` int NOT NULL DEFAULT 50,
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `provider_market_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(48) NOT NULL,
	`entityType` varchar(48) NOT NULL,
	`entityId` int NOT NULL,
	`detail` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_nodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`parentId` int,
	`kind` varchar(16) NOT NULL,
	`name` varchar(128) NOT NULL,
	`purpose` text NOT NULL,
	`marketPosition` text,
	`symbolicModel` text,
	`capabilityModel` text,
	`autonomyBoundary` varchar(32) NOT NULL DEFAULT 'proposal-only',
	`status` varchar(24) NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tensor_exchanges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`parentNodeId` int NOT NULL,
	`childNodeId` int NOT NULL,
	`folderKey` varchar(255) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`exchangeType` varchar(32) NOT NULL,
	`title` varchar(180) NOT NULL,
	`payload` text NOT NULL,
	`integrityScore` int NOT NULL DEFAULT 50,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tensor_exchanges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `watcher_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`parentNodeId` int NOT NULL,
	`childNodeId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`rationale` text NOT NULL,
	`proposedPurpose` text NOT NULL,
	`integrityScore` int NOT NULL,
	`noiseScore` int NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'proposed',
	`requiresApproval` boolean NOT NULL DEFAULT true,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `watcher_proposals_id` PRIMARY KEY(`id`)
);
