'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, User, Upload, GraduationCap, Mail, Phone } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { africanUniversities, University } from '@/lib/universities';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface StudentData {
  fullName: string;
  profileImage: string | null;
  university: University;
  otherUniversity?: string;
  yearOfStudy: string;
  academicInterests: string;
  contactMethod: 'email' | 'phone' | 'both';
  email: string;
  phone: string;
}

const YEARS_OF_STUDY = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Postgraduate'];

export function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [studentData, setStudentData] = useState<StudentData>({
    fullName: '',
    profileImage: null,
    university: africanUniversities[0],
    yearOfStudy: YEARS_OF_STUDY[0],
    academicInterests: '',
    contactMethod: 'email',
    email: '',
    phone: ''
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStudentData(prev => ({
          ...prev,
          profileImage: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = () => {
    // Complete onboarding and redirect to main app
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to StudIQ
            </h1>
            <p className="text-gray-600 text-sm">
              Let&apos;s set up your student profile
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-between mb-8">
            {[1, 2].map((num) => (
              <div
                key={num}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step >= num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > num ? <CheckCircle className="w-5 h-5" /> : num}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <User className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Personal Details</h2>
                <p className="text-gray-600 text-sm">
                  Tell us about yourself
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={studentData.fullName}
                    onChange={(e) => setStudentData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <Label>Profile Picture</Label>
                  <div className="mt-2 flex items-center space-x-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={studentData.profileImage || undefined} />
                      <AvatarFallback>
                        {studentData.fullName.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>

                <div>
                  <Label>University</Label>
                  <Select
                    value={studentData.university}
                    onValueChange={(value: University) => 
                      setStudentData(prev => ({ ...prev, university: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your university" />
                    </SelectTrigger>
                    <SelectContent>
                      {africanUniversities.map((uni) => (
                        <SelectItem key={uni} value={uni}>
                          {uni}
                        </SelectItem>
                      ))}
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {studentData.university === 'Other' && (
                  <div>
                    <Label>Other University</Label>
                    <Input
                      value={studentData.otherUniversity}
                      onChange={(e) => setStudentData(prev => ({ ...prev, otherUniversity: e.target.value }))}
                      placeholder="Enter your university name"
                    />
                  </div>
                )}

                <div>
                  <Label>Year of Study</Label>
                  <Select
                    value={studentData.yearOfStudy}
                    onValueChange={(value) => 
                      setStudentData(prev => ({ ...prev, yearOfStudy: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS_OF_STUDY.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full"
                disabled={!studentData.fullName || !studentData.university}
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <GraduationCap className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Academic Interests</h2>
                <p className="text-gray-600 text-sm">
                  Help us personalize your experience
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Academic Interests</Label>
                  <Textarea
                    value={studentData.academicInterests}
                    onChange={(e) => setStudentData(prev => ({ ...prev, academicInterests: e.target.value }))}
                    placeholder="What subjects or areas interest you the most?"
                    className="h-24"
                  />
                </div>

                <div>
                  <Label>Preferred Contact Method</Label>
                  <RadioGroup
                    value={studentData.contactMethod}
                    onValueChange={(value: 'email' | 'phone' | 'both') => 
                      setStudentData(prev => ({ ...prev, contactMethod: value }))
                    }
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="email" />
                      <Label htmlFor="email">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phone" id="phone" />
                      <Label htmlFor="phone">Phone</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="both" id="both" />
                      <Label htmlFor="both">Both</Label>
                    </div>
                  </RadioGroup>
                </div>

                {(studentData.contactMethod === 'email' || studentData.contactMethod === 'both') && (
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={studentData.email}
                      onChange={(e) => setStudentData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email address"
                    />
                  </div>
                )}

                {(studentData.contactMethod === 'phone' || studentData.contactMethod === 'both') && (
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      type="tel"
                      value={studentData.phone}
                      onChange={(e) => setStudentData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={handleComplete}
                className="w-full"
                disabled={!studentData.academicInterests || 
                  (studentData.contactMethod === 'email' && !studentData.email) ||
                  (studentData.contactMethod === 'phone' && !studentData.phone) ||
                  (studentData.contactMethod === 'both' && (!studentData.email || !studentData.phone))}
              >
                Complete Setup
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}