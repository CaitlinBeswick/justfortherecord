import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="max-w-3xl mx-auto prose prose-invert">
          <h1 className="font-serif text-4xl text-foreground mb-8">Privacy Policy</h1>
          
          <p className="text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-4">We collect information you provide directly:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Account information (email, username, display name)</li>
              <li>Profile information (bio, location, avatar)</li>
              <li>Activity data (ratings, reviews, diary entries, lists)</li>
              <li>Social connections (friends, followers)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">Your information is used to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide and improve the service</li>
              <li>Display your activity to friends and followers (based on your privacy settings)</li>
              <li>Generate personalized recommendations</li>
              <li>Communicate service updates</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Data Sources for Music Information</h2>
            <p className="text-muted-foreground mb-4">
              We display music-related content from the following sources:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-3">
              <li>
                <strong className="text-foreground">Album Cover Art</strong> - Sourced from the <a href="https://coverartarchive.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Cover Art Archive</a>, a collaborative project between the Internet Archive and MusicBrainz. Cover images are contributed by the community under various licenses.
              </li>
              <li>
                <strong className="text-foreground">Artist Photographs</strong> - Sourced from <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Wikimedia Commons</a> via Wikidata. These images are typically available under Creative Commons licenses (CC BY-SA) or are in the public domain.
              </li>
              <li>
                <strong className="text-foreground">Music Metadata</strong> - Artist names, album titles, track listings, and release information are sourced from <a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">MusicBrainz</a>, an open music encyclopedia. This data is released under the CC0 public domain dedication.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Privacy Controls</h2>
            <p className="text-muted-foreground mb-4">You have control over your data:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Set your profile to public, private, or friends-only</li>
              <li>Choose which sections of your profile are visible</li>
              <li>Block users from viewing your profile or interacting with you</li>
              <li>Delete your account and associated data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Third-Party Services</h2>
            <p className="text-muted-foreground">
              We use third-party services for authentication and data storage. These services have their own privacy policies governing their use of your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Contact</h2>
            <p className="text-muted-foreground">
              For privacy-related questions or to exercise your data rights, please contact us through the application.
            </p>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Privacy;
