import React from 'react';
import Card from '../ui/Card';
import { Folder, Star as StarIcon } from 'lucide-react';
import { DocumentCategory } from '../../types';
import Star from '../ui/Star';

interface CategoryListProps {
  categories: DocumentCategory[];
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({ 
  categories, 
  activeCategory,
  onCategoryClick 
}) => {
  return (
    <Card className="relative">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Categories</h2>
      
      <div className="space-y-2">
        {categories.map((category) => (
          <div 
            key={category.id}
            className={`p-3 rounded-lg transition-all duration-300 flex items-center cursor-pointer ${
              activeCategory === category.id 
                ? 'bg-purple-100 text-purple-600' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => onCategoryClick(category.id)}
          >
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                activeCategory === category.id 
                  ? 'bg-purple-200' 
                  : 'bg-gray-100'
              }`}
            >
              <Folder className={`w-4 h-4 ${
                activeCategory === category.id 
                  ? 'text-purple-600' 
                  : 'text-gray-500'
              }`} />
            </div>
            <span className="font-medium">{category.name}</span>
            
            {category.id === 'all' && (
              <div className="ml-2 flex">
                <StarIcon className="w-4 h-4 text-yellow-400" />
                <StarIcon className="w-4 h-4 text-yellow-400 -ml-1" />
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="absolute -bottom-3 -right-3 transform rotate-12">
        <Star />
      </div>
    </Card>
  );
};

export default CategoryList;