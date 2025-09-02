import Header from "@/components/common/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, Search } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader className="pb-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <MapPin className="h-16 w-16 text-muted-foreground" />
                <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  !
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Pin Not Found</CardTitle>
            <CardDescription className="text-lg">
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This location might have been removed, or you may have followed an
              incorrect link.
            </p>

            <div className="flex justify-center pt-4">
              <Button asChild className="flex items-center gap-2">
                <Link href="/">
                  <Search className="h-4 w-4" />
                  Explore Map
                </Link>
              </Button>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Need help? Try searching for a different location on the map.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
