export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground max-w-5xl">
        <p>&copy; {new Date().getFullYear()} WitWaves. All rights reserved.</p>
        <p className="text-sm mt-1">Weaving Words, Igniting Ideas.</p>
      </div>
    </footer>
  );
}
