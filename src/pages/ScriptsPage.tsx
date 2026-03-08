import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { demoScripts } from "@/data/demo-data";
import { Search, Star, Copy, Heart } from "lucide-react";

const categories = [...new Set(demoScripts.map((s) => s.category))];

export default function ScriptsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(demoScripts.filter((s) => s.isFavorite).map((s) => s.id))
  );

  const filtered = demoScripts.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !activeCategory || s.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Scripts Library</h1>
        <p className="text-sm text-muted-foreground">Proven DM scripts you can customize and use</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search scripts..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={!activeCategory ? "default" : "outline"} size="sm" onClick={() => setActiveCategory(null)}>All</Button>
          {categories.map((c) => (
            <Button key={c} variant={activeCategory === c ? "default" : "outline"} size="sm" onClick={() => setActiveCategory(c)}>
              {c}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((s) => (
          <Card key={s.id} className="group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{s.title}</h3>
                    <Badge variant="secondary" className="text-[10px]">{s.category}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFav(s.id)}>
                    <Heart className={`h-3.5 w-3.5 ${favorites.has(s.id) ? "fill-primary text-primary" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(s.content)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 font-mono text-xs leading-relaxed">{s.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
