export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      generated_images: {
        Row: {
          id: string
          user_id: string
          prompt: string
          model: string
          image_url: string
          parameters: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prompt: string
          model?: string
          image_url: string
          parameters?: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          prompt?: string
          model?: string
          image_url?: string
          parameters?: any
          created_at?: string
        }
      }
    }
  }
}
