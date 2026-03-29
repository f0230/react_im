import * as React from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Filter, Users, Clock, Zap, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AnimatedNumber = ({ value, formatter = (latest) => Math.round(latest * 10) / 10 }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => formatter(latest));

  React.useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.4,
      ease: "easeOut",
    });

    return controls.stop;
  }, [count, value]);

  return <motion.span>{rounded}</motion.span>;
};

export const MarketingDashboard = React.forwardRef(
  (
    {
      title = "Marketing Activities",
      teamActivities = {},
      team = {},
      cta = {},
      onFilterClick,
      className,
    },
    ref,
  ) => {
    const containerVariants = {
      hidden: { opacity: 0, y: 18 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          staggerChildren: 0.08,
        },
      },
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 12 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
    };

    const hoverTransition = { type: "spring", stiffness: 260, damping: 20 };
    const ActivityIcon = teamActivities.icon || Clock;
    const TeamIcon = team.icon || Users;
    const CtaIcon = cta.icon || Zap;
    const safeStats = Array.isArray(teamActivities.stats) ? teamActivities.stats : [];
    const safeMembers = Array.isArray(team.members) ? team.members : [];

    return (
      <motion.div
        ref={ref}
        className={cn(
          "w-full rounded-[28px] border border-neutral-200 bg-white/95 p-4 text-neutral-900 shadow-sm backdrop-blur sm:p-5",
          className,
        )}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="mb-4 flex items-center justify-between gap-3"
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
              Resumen
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
              {title}
            </h2>
          </div>

          {onFilterClick ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onFilterClick}
              aria-label="Filter activities"
              className="rounded-2xl border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <Filter className="h-4 w-4" />
            </Button>
          ) : null}
        </motion.div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.08fr,0.92fr]">
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.01, y: -3 }}
            transition={hoverTransition}
          >
            <Card className="h-full overflow-hidden rounded-[24px] border-neutral-200 bg-[linear-gradient(135deg,rgba(247,247,248,1),rgba(255,255,255,1))]">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-500">
                      {teamActivities.label || "Team Activities"}
                    </p>
                    {teamActivities.footnote ? (
                      <p className="mt-1 text-xs text-neutral-400">
                        {teamActivities.footnote}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl bg-white p-2.5 text-neutral-500 shadow-sm">
                    <ActivityIcon className="h-4 w-4" />
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap items-end gap-2">
                  <span className="text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">
                    <AnimatedNumber
                      value={Number(teamActivities.value || 0)}
                      formatter={teamActivities.valueFormatter}
                    />
                  </span>
                  {teamActivities.unitLabel ? (
                    <span className="pb-1 text-sm text-neutral-500">
                      {teamActivities.unitLabel}
                    </span>
                  ) : null}
                </div>

                <div className="mb-3 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
                  {safeStats.map((stat, index) => (
                    <motion.div
                      key={`${stat.label}-${index}`}
                      className={cn("h-full", stat.color)}
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.value}%` }}
                      transition={{ duration: 0.9, delay: 0.35 + index * 0.08 }}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-neutral-500 sm:grid-cols-4">
                  {safeStats.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", stat.color)} />
                      <span>{stat.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.01, y: -3 }}
            transition={hoverTransition}
          >
            <Card
              className={cn(
                "h-full overflow-hidden rounded-[24px] border-emerald-200 bg-[linear-gradient(135deg,rgba(241,255,232,1),rgba(255,255,255,1))]",
                team.cardClassName,
              )}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="font-semibold text-emerald-900">
                    {team.label || "Team"}
                  </p>
                  <div className="rounded-2xl bg-white/80 p-2.5 text-emerald-900 shadow-sm">
                    <TeamIcon className="h-4 w-4" />
                  </div>
                </div>

                <div className="mb-5 flex flex-wrap items-end gap-2">
                  <span className="text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl">
                    <AnimatedNumber
                      value={Number(team.memberCount || 0)}
                      formatter={team.memberCountFormatter || ((latest) => Math.round(latest))}
                    />
                  </span>
                  <span className="pb-1 text-sm text-emerald-800">
                    {team.memberLabel || "members"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex -space-x-2">
                    {safeMembers.slice(0, 5).map((member, index) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, scale: 0.65 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.45, delay: 0.5 + index * 0.08 }}
                        whileHover={{ scale: 1.12, zIndex: 10, y: -2 }}
                        className="relative"
                      >
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                          <AvatarFallback className="bg-neutral-200 text-xs font-semibold text-neutral-700">
                            {member.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                    ))}
                  </div>

                  {team.caption ? (
                    <p className="max-w-[160px] text-right text-xs text-emerald-800">
                      {team.caption}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          transition={hoverTransition}
          className="mt-4"
        >
          <div className="flex flex-col gap-3 rounded-[24px] border border-neutral-200 bg-neutral-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-2xl bg-white p-2.5 text-neutral-900 shadow-sm">
                <CtaIcon className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-neutral-600">
                {cta.text}
              </p>
            </div>

            <Button
              onClick={cta.onButtonClick}
              className="h-10 shrink-0 rounded-xl bg-neutral-900 px-4 text-white hover:bg-neutral-800"
            >
              {cta.buttonText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    );
  },
);

MarketingDashboard.displayName = "MarketingDashboard";
