import { Button, Grid, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

interface StandingsEntry {
    position: number;
    driver_name: string;
    points: number;
    points_earned: number;
    playoff_points: number;
    bonus_points: number;
    delta_next: number;
    delta_leader: number;
    driver_id: number;
    driver_first_name: string;
    driver_last_name: string;
    car_no: string;
    manufacturer: string;
    wins: number;
    stage_points: number;
    is_clinch: boolean;
}

interface LiveVehicle {
    vehicle_number: string;
    average_running_position: number;
    driver: {
        driver_id: number;
        full_name: string;
        first_name: string;
        last_name: string;
        is_in_chase?: boolean;
    };
}

interface LiveFeed {
    lap_number: number;
    elapsed_time: number;
    flag_state: number;
    race_id: number;
    laps_in_race: number;
    laps_to_go: number;
    stage?: {
        stage_num: number;
        finish_at_lap: number;
        laps_in_stage: number;
    };
    vehicles: LiveVehicle[];
}

interface TheoreticalStandingsRow {
    driver_id: number;
    driver_name: string;
    current_position: number;
    theoretical_position: number;
    current_points: number;
    stage_points: number;
    projected_points: number;
    running_position: number;
}

interface RaceScheduleEntry {
    race_id: number;
    series_id: number;
    race_season: number;
    race_name: string;
    race_type_id: number;
    track_name: string;
    race_date: string;
    date_scheduled: string;
}

const STAGE_1_2_POINTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export default function LiveStandings() {
    const [standings, setStandings] = useState<StandingsEntry[]>([]);
    const [liveFeed, setLiveFeed] = useState<LiveFeed | null>(null);
    const [isRaceActive, setIsRaceActive] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);

            try {
                const [standingsResponse, scheduleResponse] = await Promise.all([
                    fetch('https://cf.nascar.com/cacher/2026/1/points-feed.json'),
                    fetch('https://cf.nascar.com/cacher/2026/race_list_basic.json'),
                ]);

                if (!standingsResponse.ok) {
                    throw new Error('Failed to fetch standings data');
                }

                if (!scheduleResponse.ok) {
                    throw new Error('Failed to fetch schedule data');
                }

                const standingsData: StandingsEntry[] = await standingsResponse.json();
                const scheduleData: Record<string, RaceScheduleEntry[]> = await scheduleResponse.json();
                const seriesRaceList = scheduleData.series_1 ?? [];
                const now = new Date();

                const activeRace = seriesRaceList.find((race) => {
                    const raceDate = new Date(race.race_date);
                    const raceStart = new Date(raceDate);
                    const raceEnd = new Date(raceDate.getTime() + 6 * 60 * 60 * 1000);
                    return now >= raceStart && now <= raceEnd;
                });

                setStandings(standingsData);

                if (!activeRace) {
                    setIsRaceActive(false);
                    setLiveFeed(null);
                    return;
                }

                const liveResponse = await fetch(`https://cf.nascar.com/cacher/live/series_1/${activeRace.race_id}/live-feed.json`);

                if (!liveResponse.ok) {
                    setIsRaceActive(false);
                    setLiveFeed(null);
                    return;
                }

                const liveData: LiveFeed = await liveResponse.json();
                setLiveFeed(liveData);
                setIsRaceActive(true);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
        const interval = window.setInterval(fetchData, 15000);

        return () => window.clearInterval(interval);
    }, []);

    const chaseDrivers = useMemo(() => {
        if (!isRaceActive || !liveFeed) return [];

        return liveFeed.vehicles.filter((vehicle) => vehicle.driver?.is_in_chase === true);
    }, [isRaceActive, liveFeed]);

    const chaseDriverIds = useMemo(
        () => new Set(chaseDrivers.map((vehicle) => Number(vehicle.driver.driver_id))),
        [chaseDrivers]
    );

    const chaseStandings = useMemo(
        () => standings.filter((entry) => chaseDriverIds.has(Number(entry.driver_id))),
        [chaseDriverIds, standings]
    );

    const standingsMap = useMemo(() => {
        return standings.reduce<Record<number, StandingsEntry>>((map, entry) => {
            map[entry.driver_id] = entry;
            return map;
        }, {});
    }, [standings]);

    const theoreticalStandings = useMemo<TheoreticalStandingsRow[]>(() => {
        if (!isRaceActive || !liveFeed || chaseDrivers.length === 0) {
            return [];
        }

        const stageNumber = liveFeed.stage?.stage_num ?? 0;
        const stageFinishOrder = chaseDrivers
            .filter((vehicle) => chaseDriverIds.has(Number(vehicle.driver.driver_id)))
            .map((vehicle, index) => {
            const vehicleId = Number(vehicle.driver.driver_id);
            const baseEntry = standingsMap[vehicleId];
            const runningPosition = index + 1;

            let stagePoints = 0;

            if (stageNumber === 3) {
                if (runningPosition === 1) {
                    stagePoints = 55;
                } else if (runningPosition === 2) {
                    stagePoints = 35;
                } else {
                    stagePoints = Math.max(0, 35 - (runningPosition - 2));
                }
            } else if (stageNumber >= 1 && stageNumber <= 2) {
                stagePoints = STAGE_1_2_POINTS[runningPosition - 1] ?? 0;
            }

            const projectedPoints = (baseEntry?.points ?? 0) + stagePoints;

            return {
                driver_id: vehicleId,
                driver_name: baseEntry?.driver_name ?? vehicle.driver.full_name,
                current_position: baseEntry?.position ?? 0,
                theoretical_position: 0,
                current_points: baseEntry?.points ?? 0,
                stage_points: stagePoints,
                projected_points: projectedPoints,
                running_position: runningPosition,
            };
        });

        const sorted = [...stageFinishOrder].sort(
            (a, b) =>
                b.projected_points - a.projected_points ||
                a.current_position - b.current_position ||
                a.running_position - b.running_position
        );

        return sorted.map((entry, index) => ({
            ...entry,
            theoretical_position: index + 1,
        }));
    }, [chaseDrivers, liveFeed, standingsMap]);

    const currentStageText =
        isRaceActive && liveFeed?.stage
            ? `Stage ${liveFeed.stage.stage_num}`
            : 'Current standings';

    const leader = theoreticalStandings[0] ?? chaseStandings[0] ?? standings[0];
    const stageLabel = isRaceActive && liveFeed?.stage ? `Stage ${liveFeed.stage.stage_num}` : 'Current';

    return (
        <div className="dashboard-shell">
            <header className="page-header">
                <div>
                    <span className="eyebrow">NASCAR analytics</span>
                    <h1>Live Chase Standings</h1>
                </div>
                <div className="header-actions">
                    <Link to="/" className="nav-link">
                        <Button variant="outlined" className="secondary-btn">
                            Analytics
                        </Button>
                    </Link>
                    <Link to="/table" className="nav-link">
                        <Button variant="outlined" className="secondary-btn">
                            Data Table
                        </Button>
                    </Link>
                </div>
            </header>

            <div className="summary-grid">
                <div className="kpi-card">
                    <p className="kpi-label">Current Stage</p>
                    <p className="kpi-value neutral">{currentStageText}</p>
                    <p className="kpi-meta">{liveFeed ? `Lap ${liveFeed.lap_number}` : 'Waiting for live feed'}</p>
                </div>

                <div className="kpi-card">
                    <p className="kpi-label">Chase Drivers</p>
                    <p className="kpi-value neutral">{chaseDrivers.length}</p>
                    <p className="kpi-meta">Drivers currently in the playoff field</p>
                </div>

                <div className="kpi-card">
                    <p className="kpi-label">Projected Leader</p>
                    <p className="kpi-value good">{leader ? leader.driver_name : '—'}</p>
                    <p className="kpi-meta">{leader ? `${leader.projected_points} pts` : 'Waiting for standings'}</p>
                </div>

                <div className="kpi-card">
                    <p className="kpi-label">Refresh</p>
                    <p className="kpi-value neutral">15s</p>
                    <p className="kpi-meta">Auto-updates from the live feed</p>
                </div>
            </div>

            <Grid container spacing={3} sx={{ marginTop: '0 !important' }}>
                <Grid size={{ xs: 12, lg: 12 }}>
                    <div className="table-panel">
                        <div className="chart-header">
                            <p className="chart-title">{stageLabel} Theoretical Chase Standings</p>
                            <span className="kpi-meta">
                                {loading ? 'Refreshing…' : 'Live'}
                            </span>
                        </div>

                        <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Pos</th>
                                        <th>Driver</th>
                                        <th>Current Standings</th>
                                        <th>Movement</th>
                                        <th>Running Order</th>
                                        <th>Stage Points</th>
                                        <th>Projected Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isRaceActive ? (
                                        theoreticalStandings.length > 0 ? (
                                            theoreticalStandings.map((driver) => {
                                                const movement = driver.current_position > 0 ? driver.current_position - driver.theoretical_position : 0;
                                                const movementText = movement === 0 ? '—' : movement > 0 ? `+${movement}` : `${movement}`;
                                                const movementClass =
                                                    movement > 0 ? 'standings-move-up' : movement < 0 ? 'standings-move-down' : 'standings-move-flat';

                                                return (
                                                    <tr key={driver.driver_id} className={movementClass}>
                                                        <td>{driver.theoretical_position}</td>
                                                        <td>{driver.driver_name}</td>
                                                        <td>{driver.current_position > 0 ? `#${driver.current_position}` : '—'}</td>
                                                        <td className={movement > 0 ? 'standings-movement-up' : movement < 0 ? 'standings-movement-down' : 'standings-movement-flat'}>
                                                            {movementText}
                                                        </td>
                                                        <td>#{driver.running_position}</td>
                                                        <td>{driver.stage_points}</td>
                                                        <td>{driver.projected_points}</td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '18px' }}>
                                                    Waiting for chase-driver data from the live feed.
                                                </td>
                                            </tr>
                                        )
                                    ) : (
                                        standings.map((driver, index) => (
                                            <tr key={driver.driver_id} className="standings-move-flat">
                                                <td>{index + 1}</td>
                                                <td>{driver.driver_name}</td>
                                                <td>#{driver.position}</td>
                                                <td className="standings-movement-flat">—</td>
                                                <td>—</td>
                                                <td>{driver.stage_points ?? 0}</td>
                                                <td>{driver.points}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Grid>
            </Grid>

            <div className="summary-panel" style={{ padding: '18px' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 800, color: '#e2e8f0' }}>
                    Theoretical points logic
                </Typography>
                <p className="kpi-meta">
                    {isRaceActive
                        ? liveFeed?.stage?.stage_num === 3
                            ? 'Stage 3: leader gets 55, second gets 35, then each position back loses one point until the field.'
                            : 'Stages 1 and 2: the live running order is scored with 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 points for the top 10 chase drivers.'
                        : 'No active Series 1 race was found for the current time, so the current standings are being shown.'}
                </p>
            </div>
        </div>
    );
}
