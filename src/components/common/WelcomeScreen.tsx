"use client";

// Remove Button import to reduce bundle size
import { MapPin, MessageCircle, Navigation, Users } from "lucide-react";

interface WelcomeScreenProps {
    onLoadMap: () => void;
}

export default function WelcomeScreen({ onLoadMap }: WelcomeScreenProps) {
    return (
        <div className="h-full bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
            <div className="max-w-2xl mx-auto text-center space-y-8">
                {/* Logo and Title */}
                <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-2">
                        <MapPin className="h-12 w-12 text-primary" />
                        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            oPINion
                        </h1>
                    </div>
                    <p className="text-xl md:text-2xl text-muted-foreground">
                        Share Your Thoughts on the Map
                    </p>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
                    <div className="flex flex-col items-center space-y-3 p-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Navigation className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground">Explore Locations</h3>
                        <p className="text-sm text-muted-foreground text-center">
                            Discover what others think about places around the world
                        </p>
                    </div>

                    <div className="flex flex-col items-center space-y-3 p-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <MessageCircle className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground">Share Opinions</h3>
                        <p className="text-sm text-muted-foreground text-center">
                            Leave comments and photos about your favorite spots
                        </p>
                    </div>

                    <div className="flex flex-col items-center space-y-3 p-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground">Join Community</h3>
                        <p className="text-sm text-muted-foreground text-center">
                            Connect with travelers and locals worldwide
                        </p>
                    </div>
                </div>

                {/* CTA Button */}
                <div className="space-y-4">
                    <button
                        onClick={onLoadMap}
                        className="inline-flex items-center px-8 py-6 text-lg font-semibold text-primary-foreground bg-primary rounded-lg shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                        <MapPin className="h-5 w-5 mr-2" />
                        Load Interactive Map
                    </button>
                    <p className="text-sm text-muted-foreground">
                        Click to start exploring opinions around the world
                    </p>
                </div>

                {/* Stats or additional info */}
                <div className="pt-8 border-t border-border/50">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-primary">🌍</div>
                            <div className="text-sm text-muted-foreground">Global</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-primary">💬</div>
                            <div className="text-sm text-muted-foreground">Interactive</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-primary">🚀</div>
                            <div className="text-sm text-muted-foreground">Fast</div>
                        </div>
                    </div>
                </div>

                {/* Debug Button - Development Only */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="pt-4">
                        <button
                            onClick={() => {
                                localStorage.removeItem('opinion-has-loaded-map');
                                window.location.reload();
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                        >
                            🔧 Reset Welcome Screen (Dev Only)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
