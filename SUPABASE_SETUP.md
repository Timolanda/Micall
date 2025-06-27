# Supabase Storage Setup Guide

## Setting up Video Storage for MiCall

### 1. Create Storage Bucket

1. Go to your **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Configure the bucket:
   - **Name**: `videos`
   - **Public bucket**: ✅ Check this
   - **File size limit**: 100MB (or your preferred limit)
   - **Allowed MIME types**: `video/*` (or leave empty for all types)

### 2. Set up Storage Policies

Go to **Storage > Policies** and add these policies:

#### For INSERT (upload):
```sql
CREATE POLICY "Allow authenticated upload to videos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');
```

#### For SELECT (download):
```sql
CREATE POLICY "Allow authenticated read from videos" ON storage.objects
FOR SELECT USING (bucket_id = 'videos' AND auth.role() = 'authenticated');
```

#### For DELETE:
```sql
CREATE POLICY "Allow authenticated delete from videos" ON storage.objects
FOR DELETE USING (bucket_id = 'videos' AND auth.role() = 'authenticated');
```

### 3. Alternative: Use SQL Editor

You can also run this complete setup in the **SQL Editor**:

```sql
-- Create the videos bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true) 
ON CONFLICT (id) DO NOTHING;

-- Create policies
CREATE POLICY "Allow authenticated upload to videos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read from videos" ON storage.objects
FOR SELECT USING (bucket_id = 'videos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete from videos" ON storage.objects
FOR DELETE USING (bucket_id = 'videos' AND auth.role() = 'authenticated');
```

### 4. Test the Setup

After setting up the bucket and policies:

1. Try using the "Go Live" button in your app
2. Check the browser console for any errors
3. Verify the video appears in your Supabase Storage dashboard

### 5. Troubleshooting

**Common Issues:**

- **"Bucket not found"**: Make sure the bucket name is exactly `videos`
- **"Permission denied"**: Check that the storage policies are correctly set up
- **"File too large"**: Increase the file size limit in bucket settings
- **"Invalid MIME type"**: Check the allowed MIME types in bucket settings

**Need Help?**
- Check the Supabase documentation: https://supabase.com/docs/guides/storage
- Verify your environment variables are set correctly
- Ensure your Supabase project is active and not paused 