import { Search, Sparkles, UploadCloud } from "lucide-react";

const features = [
    {
      icon: UploadCloud,
      title: 'Drop & index',
      body: 'Upload PDFs and Word files. We process them in the background so you can focus on the work.',
    },
    {
      icon: Search,
      title: 'Semantic search',
      body: 'Ask in natural language and find the right passage across your whole document library.',
    },
    {
      icon: Sparkles,
      title: 'Built for focus',
      body: 'A calm, dark interface with warm accents — designed for long research sessions.',
    },
  ] as const;

export default features;