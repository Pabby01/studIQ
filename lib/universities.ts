export const africanUniversities = [
  // Nigeria
  'University of Lagos',
  'University of Ibadan',
  'Ahmadu Bello University',
  'University of Nigeria',
  'Covenant University',
  'Federal University of Technology, Akure',
  'Federal University of Agriculture, Abeokuta',
  'Federal University of Technology, Minna',
  'Federal University of Technology, Owerri',
  'Obafemi Awolowo university',
  
  // South Africa
  'University of Cape Town',
  'University of the Witwatersrand',
  'Stellenbosch University',
  'University of Pretoria',
  'University of KwaZulu-Natal',
  
  // Kenya
  'University of Nairobi',
  'Strathmore University',
  'Kenyatta University',
  'Moi University',
  'Egerton University',
  
  // Ghana
  'University of Ghana',
  'Kwame Nkrumah University of Science and Technology',
  'University of Cape Coast',
  'Ashesi University',
  'University of Education',
  
  // Egypt
  'Cairo University',
  'American University in Cairo',
  'Alexandria University',
  'Ain Shams University',
  'Mansoura University',
  
  // Morocco
  'Mohammed V University',
  'Cadi Ayyad University',
  'Hassan II University',
  'Al Akhawayn University',
  'Ibn Tofail University',
  
  // Uganda
  'Makerere University',
  'Uganda Christian University',
  'Kyambogo University',
  'Mbarara University of Science and Technology',
  'Uganda Martyrs University',
  
  // Tanzania
  'University of Dar es Salaam',
  'Sokoine University of Agriculture',
  'Mzumbe University',
  'The State University of Zanzibar',
  'Ardhi University',
  
  // Ethiopia
  'Addis Ababa University',
  'Bahir Dar University',
  'Jimma University',
  'Mekelle University',
  'Hawassa University',
  
  // Rwanda
  'University of Rwanda',
  'Mount Kenya University Rwanda',
  'Adventist University of Central Africa',
  'Carnegie Mellon University Africa',
  'African Leadership University'
].sort();

export type University = typeof africanUniversities[number] | 'Other';