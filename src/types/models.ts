export interface Profile {
    id: string;
    name: string;
    username?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    university_id?: string | null;
    status?: 'pending' | 'approved' | 'rejected' | 'banned' | null;
    department?: string | null;
    year_of_study?: string | null;
    student_id_url?: string | null;
    campus_rank?: number | null;
    user_score?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface University {
    id: string;
    name: string;
    domain: string;
    logo_url?: string | null;
    created_at?: string;
}

export interface Community {
    id: string;
    name: string;
    slug: string;
    type: 'university' | 'course' | 'interest' | 'club' | 'marketplace' | 'study_group';
    description?: string | null;
    university_id?: string | null;
    image_url?: string | null;
    created_by?: string | null;
    created_at?: string;
    deleted_at?: string | null;
}
