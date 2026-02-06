import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactForm } from "@/components/ContactForm";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Contact = () => {
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

        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="font-serif text-4xl text-foreground">Contact Us</h1>
          </div>
          
          <p className="text-muted-foreground mb-8">
            Have a question, suggestion, or found a bug? We'd love to hear from you! 
            Fill out the form below and we'll get back to you as soon as possible.
          </p>

          <ContactForm />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Contact;