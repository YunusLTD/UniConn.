export const POST_COMMENT_COUNT_CHANGED_EVENT = 'postCommentCountChanged';

export type PostCommentCountChangedPayload = {
    postId: string;
    count?: number;
    delta?: number;
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

export const getPostCommentCount = (post: any): number => {
    const parsed = toSafeNumber(post?.comments?.[0]?.count);
    if (parsed === null) return 0;
    return Math.max(0, Math.trunc(parsed));
};

export const getCommentTotalFromResponse = (response: any): number => {
    const totalFromPagination = toSafeNumber(response?.pagination?.total);
    if (totalFromPagination !== null) {
        return Math.max(0, Math.trunc(totalFromPagination));
    }

    if (Array.isArray(response?.data)) {
        return response.data.length;
    }

    return 0;
};

export const applyPostCommentCountChange = (post: any, payload: PostCommentCountChangedPayload) => {
    if (!post || post.id !== payload.postId) return post;

    const current = getPostCommentCount(post);
    const absolute = toSafeNumber(payload.count);
    const delta = toSafeNumber(payload.delta);

    let next = current;
    if (absolute !== null) {
        next = absolute;
    } else if (delta !== null) {
        next = current + delta;
    } else {
        return post;
    }

    next = Math.max(0, Math.trunc(next));
    if (next === current) return post;

    const comments = Array.isArray(post.comments) ? post.comments : [];
    const first = comments[0] && typeof comments[0] === 'object' ? comments[0] : {};
    const nextComments = comments.length > 0
        ? [{ ...first, count: next }, ...comments.slice(1)]
        : [{ count: next }];

    return {
        ...post,
        comments: nextComments,
    };
};
