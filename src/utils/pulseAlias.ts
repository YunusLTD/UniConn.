const ADJECTIVES = [
    'Quiet', 'Nova', 'Velvet', 'Silver', 'Echo', 'Lunar', 'Ivory', 'Rapid',
    'Solar', 'Crimson', 'Cobalt', 'Sable', 'Misty', 'Neon', 'Arctic', 'Amber',
    'Static', 'Secret', 'Hidden', 'Swift', 'Cloud', 'Midnight', 'Golden', 'Obsidian',
];

const NOUNS = [
    'Fox', 'Raven', 'Comet', 'Orbit', 'Whisper', 'Wave', 'Falcon', 'Spark',
    'Drift', 'Pulse', 'Glider', 'Cipher', 'Vertex', 'Scout', 'Signal', 'Kite',
    'Dawn', 'Storm', 'Harbor', 'Echo', 'Voyager', 'Pebble', 'Flare', 'Mosaic',
];

function hashString(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function createPulseAliasSeed(): number {
    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

export function getPulseAlias(id: string, seed: number): string {
    const hash = hashString(`${seed}:${id}`);
    const adjective = ADJECTIVES[hash % ADJECTIVES.length];
    const noun = NOUNS[(hash >>> 8) % NOUNS.length];
    const suffix = ((hash >>> 16) % 90) + 10;
    return `${adjective}${noun}${suffix}`;
}
