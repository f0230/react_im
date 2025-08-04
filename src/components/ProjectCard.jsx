import React from 'react';

const ProjectCard = ({ project }) => {
  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Proyecto #{project.id}</span>
          </div>
          {project.link && project.link !== '#' && (
            <a 
              href={project.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver proyecto
            </a>
          )}
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
          {project.title}
        </h1>
        
        <p className="text-lg text-gray-600 leading-relaxed mb-6">
          {project.description}
        </p>
      </div>

      {/* Image Section */}
      <div className="mb-6 flex-1 min-h-0">
        <div className="relative h-full min-h-[180px] max-h-[240px] rounded-2xl overflow-hidden group">
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
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Tecnologías</h3>
        <div className="flex flex-wrap gap-2">
          {project.technologies.map((tech, index) => (
            <span 
              key={tech} 
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white rounded-full transition-all duration-200 hover:scale-105"
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
