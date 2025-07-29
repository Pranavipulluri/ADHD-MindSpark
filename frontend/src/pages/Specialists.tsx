import React from 'react';
import Header from '../components/dashboard/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { User, Phone, Calendar, MessageCircle } from 'lucide-react';

interface SpecialistCardProps {
  name: string;
  role: string;
  description: string;
  avatarUrl: string;
}

const SpecialistCard: React.FC<SpecialistCardProps> = ({
  name,
  role,
  description,
  avatarUrl,
}) => {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3">
          <img 
            src={avatarUrl} 
            alt={name} 
            className="w-full h-48 md:h-full object-cover rounded-lg"
          />
        </div>
        <div className="w-full md:w-2/3">
          <h3 className="text-xl font-bold mb-1">{name}</h3>
          <p className="text-purple-600 font-medium mb-3">{role}</p>
          <p className="text-gray-600 mb-4">{description}</p>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="primary"
              leftIcon={<Calendar className="w-4 h-4" />}
            >
              Schedule
            </Button>
            <Button 
              variant="outline"
              leftIcon={<MessageCircle className="w-4 h-4" />}
            >
              Message
            </Button>
            <Button 
              variant="ghost"
              leftIcon={<Phone className="w-4 h-4" />}
            >
              Call
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

const Specialists: React.FC = () => {
  const specialists = [
    {
      id: '1',
      name: 'Dr. Emma Johnson',
      role: 'Child Psychologist',
      description: 'Dr. Johnson specializes in helping children with ADHD develop strategies for focus and self-regulation. She has 15 years of experience working with children of all ages.',
      avatarUrl: 'https://images.pexels.com/photos/5214413/pexels-photo-5214413.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    },
    {
      id: '2',
      name: 'Michael Chen',
      role: 'Educational Therapist',
      description: 'Michael works with children to develop personalized learning strategies that accommodate their unique needs and strengths. He specializes in making learning fun and engaging.',
      avatarUrl: 'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    },
    {
      id: '3',
      name: 'Sarah Rodriguez',
      role: 'Behavioral Coach',
      description: 'Sarah helps children develop positive behaviors and coping mechanisms for challenging situations. She creates personalized strategies that build on each child\'s strengths.',
      avatarUrl: 'https://images.pexels.com/photos/6147369/pexels-photo-6147369.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    },
  ];

  return (
    <div className="py-8">
      <Header 
        title="Specialists" 
        subtitle="Connect with professionals who specialize in supporting children with ADHD. Schedule appointments, send messages, or join group sessions." 
      />
      
      <div className="max-w-6xl mx-auto px-4">
        <div className="space-y-6">
          {specialists.map((specialist) => (
            <SpecialistCard 
              key={specialist.id}
              name={specialist.name}
              role={specialist.role}
              description={specialist.description}
              avatarUrl={specialist.avatarUrl}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Specialists;