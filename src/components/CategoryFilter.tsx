import { Category } from '../types/contract';
interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: Category | 'All';
  onSelect: (category: Category | 'All') => void;
}
export function CategoryFilter({
  categories,
  selectedCategory,
  onSelect
}: CategoryFilterProps) {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect('All')}
        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'All' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>

        All Categories
      </button>
      {categories.map((category) =>
      <button
        key={category}
        onClick={() => onSelect(category)}
        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === category ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>

          {category}
        </button>
      )}
    </div>);

}