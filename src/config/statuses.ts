// rename this to statuses.ts and edit as needed

type Status = {
	text?: string | undefined | null;
	presence: "Online" | "Idle" | "Busy" | "Invisible"; // add "Focus" when we upgrade revolt.js
};

export const statuses: Status[] = [
	{ text: "sus", presence: "Online" },
	{ text: "amogus", presence: "Idle" },
	{ text: "impostor", presence: "Busy" },
	// { text: "crewmate", presence: "Focus" },
	{ text: "this will not be visible", presence: "Invisible" },
];
