import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactForm } from "@/components/ContactForm";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
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
          <h1 className="font-serif text-4xl text-foreground mb-8">Terms of Service</h1>
          
          <p className="text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using Just For The Record ("JFTR"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground">
              JFTR is a music logging and discovery platform that allows users to track albums they've listened to, rate and review music, and discover new artists. The service is provided "as is" and may be modified or discontinued at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate information when creating an account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">4. User Content</h2>
            <p className="text-muted-foreground">
              You retain ownership of content you submit (reviews, ratings, lists). By posting content, you grant JFTR a non-exclusive license to display and distribute that content within the service. You agree not to post content that is unlawful, harmful, or infringes on others' rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Third-Party Data Sources</h2>
            <p className="text-muted-foreground mb-4">
              JFTR uses data from third-party sources to provide music information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong className="text-foreground">MusicBrainz</strong> - Artist, album, and track metadata is sourced from MusicBrainz, an open music encyclopedia. This data is available under the CC0 public domain dedication.
              </li>
              <li>
                <strong className="text-foreground">Cover Art Archive</strong> - Album artwork is sourced from the Cover Art Archive, a joint project between the Internet Archive and MusicBrainz. Images are contributed by users under various licenses.
              </li>
              <li>
                <strong className="text-foreground">Wikimedia Commons</strong> - Artist photographs are sourced from Wikimedia Commons when available. These images are typically licensed under Creative Commons licenses (CC BY-SA or similar).
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              JFTR is provided without warranties of any kind. We are not liable for any damages arising from your use of the service, including but not limited to direct, indirect, incidental, or consequential damages.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Contact</h2>
            <p className="text-muted-foreground mb-6">
              For questions about these terms, please use the form below.
            </p>
            <ContactForm />
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Terms;
