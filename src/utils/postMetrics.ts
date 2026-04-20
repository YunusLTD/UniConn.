export const POST_METRICS_CHANGED_EVENT = 'postMetricsChanged';

export type PostMetricsChangedPayload = {
    postId: string;
    view_count?: number;
    repost_count?: number;
    interaction_count?: number;
    has_reposted?: boolean;
};

const toSafeNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return null;
};

export const applyPostMetricsChange = (post: any, payload: PostMetricsChangedPayload) => {
    if (!post || post.id !== payload.postId) return post;

    let changed = false;
    const nextPost = { ...post };

    const nextViewCount = toSafeNumber(payload.view_count);
    if (nextViewCount !== null && nextViewCount !== toSafeNumber(post.view_count)) {
        nextPost.view_count = Math.max(0, Math.trunc(nextViewCount));
        changed = true;
    }

    const nextRepostCount = toSafeNumber(payload.repost_count);
    if (nextRepostCount !== null && nextRepostCount !== toSafeNumber(post.repost_count)) {
        nextPost.repost_count = Math.max(0, Math.trunc(nextRepostCount));
        changed = true;
    }

    const nextInteractionCount = toSafeNumber(payload.interaction_count);
    if (nextInteractionCount !== null && nextInteractionCount !== toSafeNumber(post.interaction_count)) {
        nextPost.interaction_count = Math.max(0, Math.trunc(nextInteractionCount));
        changed = true;
    }

    if (typeof payload.has_reposted === 'boolean' && payload.has_reposted !== Boolean(post.has_reposted)) {
        nextPost.has_reposted = payload.has_reposted;
        changed = true;
    }

    return changed ? nextPost : post;
};
