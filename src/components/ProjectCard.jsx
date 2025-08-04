import React from 'react';

const ProjectCard = ({ project }) => {
  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Header Section */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
            <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Proyecto #{project.id}</span>
          </div>
          {project.link && project.link !== '#' && (
            <a 
              href={project.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors duration-200 self-start sm:self-auto"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="hidden sm:inline">Ver proyecto</span>
              <span className="sm:hidden">Ver</span>
            </a>
          )}
        </div>
        
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
          {project.title}
        </h1>
        
        <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
          {project.description}
        </p>
      </div>

      {/* Image Section */}
      <div className="mb-4 sm:mb-6 flex-1 min-h-0">
        <div className="relative h-full min-h-[120px] sm:min-h-[150px] md:min-h-[180px] max-h-[160px] sm:max-h-[200px] md:max-h-[240px] rounded-xl sm:rounded-2xl overflow-hidden group">
          {project.link && project.link !== '#' ? (
            <a href={project.link} target="_blank" rel="noopener noreferrer" className="block h-full">
              <img 
                src={project.imageUrl} 
                alt={project.title} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </a>
          ) : (
            <img 
              src={project.imageUrl} 
              alt={project.title} 
              className="w-full h-full object-cover" 
            />
          )}
        </div>
      </div>

      {/* Technologies Section */}
      <div>
        <h3 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 sm:mb-3">Tecnologías</h3>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {project.technologies.map((tech, index) => (
            <span 
              key={tech} 
              className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-white rounded-full transition-all duration-200 hover:scale-105"
              style={{
                background: `linear-gradient(135deg, hsl(${(index * 40 + 200) % 360}, 70%, 60%), hsl(${(index * 40 + 240) % 360}, 70%, 70%))`,
                boxShadow: `0 4px 12px hsla(${(index * 40 + 200) % 360}, 70%, 60%, 0.3)`
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
