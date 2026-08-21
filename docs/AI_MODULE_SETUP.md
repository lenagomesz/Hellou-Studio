# AI Module Setup Guide

## Environment Variables

Add these to your `.env.local`:

```bash
# Google Generative AI
GOOGLE_GENAI_API_KEY=your-google-genai-api-key-here
```

### Getting Your Google GenAI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Click "Create API Key"
3. Copy the key
4. Paste into `.env.local` as `GOOGLE_GENAI_API_KEY`

## Supabase Setup

### 1. Run the Migration

1. Open your Supabase project
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the entire contents of:
   `supabase/migrations/20260821_add_ai_content_tables.sql`
5. Click **Run**

You should see three new tables in your Supabase dashboard:
- `ai_brand_voice` (stores editable brand guidelines)
- `ai_generated_content` (logs all AI-generated content)
- `blog_posts` (SEO blog posts with full CRUD)

### 2. Verify Default Data

In Supabase SQL Editor, run:

```sql
select * from public.ai_brand_voice limit 1;
```

You should see one row with default brand voice settings.

## Dashboard Access

Once set up, access the AI Dashboard at:

```
http://localhost:3000/dashboard/ai-dashboard
```

### Features

**1. Market Trends Analysis** (Analisar Tendencias)
- Click "Analyze Trends" button
- System analyzes your 29 products against current market trends
- Returns 3 market trends + 3 new product suggestions
- Auto-logged for reference

**2. Social Media Campaigns** (Gerar Campanha de Divulgacao)
- Select a product from dropdown
- Click "Generate"
- Get: Visual hook, video script (30-45s), high-conversion caption
- Copy-to-clipboard for easy sharing

**3. SEO Blog Posts** (Automacao de Blog)
- Enter a blog topic (e.g., "ideias de decoracao para quarto gamer")
- Click "Generate"
- Post auto-publishes to `/blog/[slug]`
- You can edit/delete anytime in blog management

## Brand Voice Customization

The AI uses editable brand guidelines stored in the database. To modify:

1. Go to **Supabase Dashboard** > **SQL Editor**
2. Run:

```sql
update public.ai_brand_voice
set 
  tone = 'casual', -- or 'professional', 'balanced'
  tone_description = 'Your custom tone description',
  interests = array['geek', 'design', 'organization', 'gaming'],
  brand_rules = 'Your custom brand rules here'
where id = (select id from public.ai_brand_voice order by created_at desc limit 1);
```

Changes apply immediately to all future AI generations.

## Rate Limiting & Monitoring

Rate limits are **soft** (warnings only, no blocking):

- Market Trends: 10x per hour per user
- Social Campaigns: Unlimited
- Blog Posts: Unlimited

Monitor usage in Supabase table `ai_generated_content`:

```sql
select feature_type, count(*) as count, max(generated_at) as last_used
from public.ai_generated_content
group by feature_type;
```

## Troubleshooting

### "Configure GOOGLE_GENAI_API_KEY"
- Restart your dev server: `npm run dev`
- Check `.env.local` has the correct key
- Verify key is valid at [Google AI Studio](https://aistudio.google.com/app/apikeys)

### "Invalid response structure from AI"
- May indicate API overload; wait a minute and retry
- Check Gemini quota at [Google AI Studio](https://aistudio.google.com/app/apikeys)

### Blog posts not appearing
- Verify `blog_posts` table exists: `select count(*) from public.blog_posts;`
- Check post status is 'published': `select id, title, status from public.blog_posts;`
- Ensure `/blog/[slug]` route exists in your Next.js app

## Cost Optimization

Currently using **Gemini 1.5 Flash** (most cost-effective):
- Market analysis: ~5-15 tokens per request
- Social campaign: ~2-5 tokens per request
- Blog post: ~10-20 tokens per request

Monitor API costs:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Check "Generative Language API" usage
3. Adjust model if needed (edit `geminiClient.ts`)

## Next Steps

- Add `/blog` public page to display published posts
- Implement blog editing UI in admin dashboard
- Set up scheduled cron job for auto-blog generation (optional)
- Create brand voice editor UI in admin (currently DB-only)
