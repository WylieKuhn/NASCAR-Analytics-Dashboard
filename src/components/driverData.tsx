import {Autocomplete, Button, Grid, TextField, Typography, FormControlLabel, Checkbox} from "@mui/material";
import {LineChart, ScatterChart} from "@mui/x-charts";
import {useEffect, useState} from "react";
import {roundToUp} from "round-to";
import {standardDeviation} from "simple-statistics";
import {Link} from "react-router";



export default function DriverData() {


    interface PitStop {
        vehicle_number: string;
        driver_name: string;
        vehicle_manufacturer: string;
        leader_lap: number;
        lap_count: number;
        pit_in_flag_status: number;
        pit_out_flag_status: number;
        pit_in_race_time: number;
        pit_out_race_time: number;
        total_duration: number;
        box_stop_race_time: number;
        box_leave_race_time: number;
        pit_stop_duration: number;
        in_travel_duration: number;
        out_travel_duration: number;
        pit_stop_type: string;
        left_front_tire_changed: boolean;
        left_rear_tire_changed: boolean;
        right_front_tire_changed: boolean;
        right_rear_tire_changed: boolean;
        previous_lap_time: number;
        next_lap_time: number;
        pit_in_rank: number;
        pit_out_rank: number;
        positions_gained_lost: number;
    }

    const [pitStops, setPitStops] = useState<PitStop[]>([]);
    const [races, setRaces] = useState<Race[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
    const [selectedRace, setSelectedRace] = useState<Race | null>(null);
    const [lapTimes, setLapTimes] = useState<LapData[] | null>(null);
    const [currentLap, setCurrentLap] = useState<number | null>(null);
    const [excludeOutliers, setExcludeOutliers] = useState<boolean>(false);


    async function getPitStops(): Promise<PitStop[]> {
        const response = await fetch(
            `https://cf.nascar.com/cacher/live/series_1/${selectedRace?.race_id}/live-pit-data.json`
        )
        if (!response.ok) {
            throw new Error("Failed To Fetch Data!")
        }
        return response.json()
    }

    interface ScheduleEvent {
        event_name: string;
        notes: string;
        start_time_utc: string;
        run_type: number;
    }

    interface RaceInfraction {
        // Empty in your sample, add fields when you see actual data
        [key: string]: unknown;
    }

    interface Race {
        race_id: number;
        series_id: number;
        race_season: number;
        race_name: string;
        race_type_id: number;
        restrictor_plate: boolean;

        track_id: number;
        track_name: string;

        date_scheduled: string;
        race_date: string;
        qualifying_date: string;
        tunein_date: string;

        scheduled_distance: number;
        actual_distance: number;

        scheduled_laps: number;
        actual_laps: number;

        stage_1_laps: number;
        stage_2_laps: number;
        stage_3_laps: number;

        number_of_cars_in_field: number;

        pole_winner_driver_id: number;
        pole_winner_speed: number;
        pole_winner_laptime: number | null;

        number_of_lead_changes: number;
        number_of_leaders: number;
        number_of_cautions: number;
        number_of_caution_laps: number;

        average_speed: number;
        total_race_time: string;
        margin_of_victory: string;

        race_purse: number;
        race_comments: string;
        attendance: number;

        infractions: RaceInfraction[];
        schedule: ScheduleEvent[];

        radio_broadcaster: string;
        television_broadcaster: string;
        satellite_radio_broadcaster: string;

        master_race_id: number;

        inspection_complete: boolean;

        playoff_round: number;

        is_qualifying_race: boolean;
        qualifying_race_no: number;
        qualifying_race_id: number;

        has_qualifying: boolean;

        winner_driver_id: number;
    }

    interface Lap {
        Lap: number,
        LapTime: number,
        lapSpeed: number,
        RunningPos: number
    }

    interface LapData {
        Number: string;
        FullName: string;
        Manufacturer: string;
        RunningPos: number;
        NASCARDriverID: number;
        Laps: Lap[];
    }

    interface LiveFeed {
        lap_number?: number;
        'lap _number'?: number;
        laps_in_race?: number;
        laps_to_go?: number;
    }

    const handlePitStopRequest = async () => {

        try {
            const data = await getPitStops();
            setPitStops(data)
        } catch (err) {
            console.log((err as Error).message)
        } finally {
            console.log(false);
        }
    }

    useEffect(() => {
        async function getRaces() {
            try {
                const response = await fetch("https://cf.nascar.com/cacher/2026/race_list_basic.json");

                if (!response.ok) {
                    throw new Error("Failed To Fetch Race Data");
                }
                const data = await response.json();


                const sortedRaces = [...data.series_1].sort(
                    (a: Race, b: Race) =>
                        new Date(a.race_date).getTime() -
                        new Date(b.race_date).getTime()
                );

                setRaces(sortedRaces);

            } catch (err) {
                if (err instanceof Error) {
                    console.log(err.message);
                }
            } finally {
                console.log(false);
            }
        }

        getRaces();
    }, []);

    useEffect(() => {
        if (!selectedRace) return;

        async function getLapData() {
            try {
                const response = await fetch(`https://cf.nascar.com/cacher/2026/1/${selectedRace?.race_id}/lap-times.json`);

                if (!response.ok) {
                    throw new Error("Failed To Fetch Lap Data");
                }
                const data = await response.json();

                setLapTimes(data.laps);

            } catch (err) {
                if (err instanceof Error) {
                    console.log(err.message);
                }
            } finally {
                console.log(false);
            }
        }

        async function getCurrentLap() {
            if (!selectedRace) return;

            try {
                const response = await fetch(`https://cf.nascar.com/cacher/live/series_1/${selectedRace.race_id}/live-feed.json`);

                if (!response.ok) {
                    throw new Error("Failed To Fetch Live Lap Data");
                }

                const data = (await response.json()) as LiveFeed;
                const lapNumber = data.lap_number ?? data['lap _number'] ?? null;
                setCurrentLap(lapNumber !== null ? Number(lapNumber) : null);
            } catch (err) {
                if (err instanceof Error) {
                    console.log(err.message);
                }
                setCurrentLap(null);
            }
        }

        getLapData();
        getCurrentLap();

        const intervalId = window.setInterval(getCurrentLap, 15000);
        return () => window.clearInterval(intervalId);
    }, [selectedRace]);

    const driverNames = [
        ...new Set(pitStops.map((stop) => stop.driver_name))
    ].sort();

    function formatRaceName(race: Race): string {
        const date = new Date(race.race_date);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        return `${month}/${day} - ${race.track_name}`;
    }

    const filteredPitStops = excludeOutliers ? pitStops.filter(
        (stop) =>
            stop.pit_stop_duration !== -1 &&
            (!selectedDriver || stop.driver_name == selectedDriver) && stop.pit_stop_duration < 40) : pitStops.filter(
        (stop) =>
            stop.pit_stop_duration !== -1 &&
            (!selectedDriver || stop.driver_name == selectedDriver)
    );

    const avgPitStopTime =
        filteredPitStops.length > 0 ?
            filteredPitStops.reduce((sum, stop) => sum + stop.pit_stop_duration, 0) / filteredPitStops.length : 0;

    const fastPitStopTime = filteredPitStops.length > 0 ?
        Math.min(...filteredPitStops.map(stop => stop.pit_stop_duration)) : 0;
    const slowestPitStopTime = filteredPitStops.length > 0 ?
        Math.max(...filteredPitStops.map(stop => stop.pit_stop_duration)) : 0;
    const allDriverAvg = pitStops.length > 0 ?
        pitStops.reduce((sum, stop) => sum + stop.pit_stop_duration, 0) / pitStops.length : 0;
    const gainedLostChartData = filteredPitStops.map((stop) =>({
        x: stop.pit_stop_duration,
        y: stop.positions_gained_lost
    }))
    const lastTireChange = filteredPitStops.filter((stop) => stop.right_front_tire_changed ||
        stop.right_rear_tire_changed ||
        stop.left_front_tire_changed ||
        stop.left_rear_tire_changed).at(-1);

    const lastLeftTireChange = selectedDriver
        ? filteredPitStops.filter((stop) => stop.left_front_tire_changed || stop.left_rear_tire_changed).at(-1) ?? null
        : null;

    const lastRightTireChange = selectedDriver
        ? filteredPitStops.filter((stop) => stop.right_front_tire_changed || stop.right_rear_tire_changed).at(-1) ?? null
        : null;

    const lapsSinceLeftTireChange = selectedDriver && currentLap && lastLeftTireChange
        ? Math.max(0, currentLap - lastLeftTireChange.lap_count)
        : null;

    const lapsSinceRightTireChange = selectedDriver && currentLap && lastRightTireChange
        ? Math.max(0, currentLap - lastRightTireChange.lap_count)
        : null;

    const lastPitStop = filteredPitStops.at(-1);

    const driverLapData = lapTimes?.find((lapdata) => lapdata.FullName == selectedDriver);

    /* const lapsSinceTireChange =
        driverLapData && lastTireChange
            ? driverLapData.Laps.slice(lastTireChange.lap_count)
            : []; */

    const lapsSinceTLastPitStop =
        driverLapData && lastPitStop
            ? driverLapData.Laps.slice(lastPitStop.lap_count)
            : [];

    const runningPositionDeltaData =
        lastTireChange !== undefined
            ? lapsSinceTLastPitStop.map((lap) => ({
                lap: lap.Lap,
                delta: lastTireChange.pit_in_rank - lap.RunningPos
            }))
            : [];


    const stopDurations =
        filteredPitStops.length > 1 ? standardDeviation(filteredPitStops.map((stop) => stop.pit_stop_duration)) : 0;

    const avgTone = selectedDriver ? (avgPitStopTime < allDriverAvg ? "good" : "bad") : "neutral";

    const chartAxisStyle = {
        tickLabelStyle: { fill: '#ffffff', fontSize: 11 },
        labelStyle: { fill: '#ffffff', fontSize: 12 },
        tickLine: { stroke: '#ffffff' },
        axisLine: { stroke: '#ffffff' },
        grid: { stroke: 'rgba(255, 255, 255, 0.14)' },
    };

    return (
        <div className="dashboard-shell">
            <header className="page-header">
                <div>
                    <span className="eyebrow">NASCAR Performance</span>
                    <h1>Pit Stop Analytics</h1>
                </div>
                <div className="header-actions">
                    <Link to="/table" className="nav-link">
                        <Button variant="outlined" className="secondary-btn">
                            Data Table
                        </Button>
                    </Link>
                </div>
            </header>

            <div className="filters-panel">
                <div className="filter-grid">
                    <Button onClick={handlePitStopRequest} variant="contained" className="primary-btn" sx={{ height: '56px' }}>
                        Load Race Data
                    </Button>

                    <Autocomplete
                        options={races}
                        value={selectedRace}
                        getOptionLabel={formatRaceName}
                        onChange={(_, race) => setSelectedRace(race)}
                        renderInput={(params) => <TextField {...params} label="Select Race" />}
                    />

                    <Autocomplete
                        options={driverNames}
                        value={selectedDriver}
                        onChange={(_, newValue) => setSelectedDriver(newValue)}
                        renderInput={(params) => <TextField {...params} label="Driver" />}
                    />

                    <div className="checkbox-wrap">
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={excludeOutliers}
                                    onChange={(_, checked) => setExcludeOutliers(checked)}
                                    sx={{ color: '#38bdf8', '&.Mui-checked': { color: '#38bdf8' } }}
                                />
                            }
                            label="Exclude Outliers"
                        />
                    </div>
                </div>
            </div>

            <div className="summary-grid">
                <div className="kpi-card">
                    <p className="kpi-label">Average Duration</p>
                    <p className={`kpi-value ${avgTone}`}>{roundToUp(avgPitStopTime, 3)}s</p>
                    <p className="kpi-meta">
                        {selectedDriver ? 'Filtered for the current driver selection' : 'Across the current data set'}
                    </p>
                </div>

                <div className="kpi-card">
                    <p className="kpi-label">Fastest Stop</p>
                    <p className="kpi-value neutral">{roundToUp(fastPitStopTime, 3)}s</p>
                    <p className="kpi-meta">Best pit performance in the selected window</p>
                </div>

                <div className="kpi-card">
                    <p className="kpi-label">Slowest Stop</p>
                    <p className="kpi-value neutral">{roundToUp(slowestPitStopTime, 3)}s</p>
                    <p className="kpi-meta">Largest stop duration detected</p>
                </div>

                <div className="kpi-card">
                    <p className="kpi-label">Last Pit Lap</p>
                    <p className="kpi-value neutral">{lastPitStop?.lap_count ?? '—'}</p>
                    <p className="kpi-meta">Most recent stop from the active filter</p>
                </div>
            </div>

            <Grid container spacing={3} sx={{ marginTop: '0 !important' }}>
                <Grid size={{ xs: 12, lg: 6 }}>
                    <div className="chart-panel">
                        <div className="chart-header">
                            <p className="chart-title">Pit Duration vs. Position Change</p>
                        </div>
                        <ScatterChart
                            height={300}
                            width={560}
                            series={[{ label: selectedDriver ?? 'All Drivers', data: gainedLostChartData }]}
                            xAxis={[{ ...chartAxisStyle, label: 'Pit Stop Duration (s)' }]}
                            yAxis={[{ ...chartAxisStyle, label: 'Positions Gained/Lost' }]}
                            margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
                            sx={{ width: '100%', maxWidth: '560px', margin: '0 auto', display: 'block' }}
                        />
                    </div>
                </Grid>

                <Grid size={{ xs: 12, lg: 6 }}>
                    <div className="chart-panel">
                        <div className="chart-header">
                            <p className="chart-title">Position Delta Since Last Pit</p>
                        </div>
                        <LineChart
                            height={300}
                            width={560}
                            series={[
                                {
                                    data: runningPositionDeltaData.map((posData) => posData.delta),
                                    label: 'Position Delta Since Last Pit Stop',
                                    curve: 'linear',
                                },
                            ]}
                            xAxis={[{ ...chartAxisStyle, data: runningPositionDeltaData.map((data) => data.lap), label: 'Lap' }]}
                            yAxis={[{ ...chartAxisStyle, label: 'Position Delta' }]}
                            margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
                            sx={{ width: '100%', maxWidth: '560px', margin: '0 auto', display: 'block' }}
                        />
                    </div>
                </Grid>

                <Grid size={{ xs: 12, lg: 4 }}>
                    <div className="summary-panel">
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 800, color: '#e2e8f0' }}>
                            Stability Metrics
                        </Typography>
                        <div className="kpi-card" style={{ padding: 0, background: 'transparent', boxShadow: 'none', border: 'none' }}>
                            <p className="kpi-label">Standard Deviation</p>
                            <p className="kpi-value neutral">{roundToUp(stopDurations, 3)}s</p>
                            <p className="kpi-meta">How tightly stop times are clustered</p>

                            <p className="kpi-label" style={{ marginTop: 12 }}>Laps Since Tire Change</p>
                            {selectedDriver ? (
                                <>
                                    <div className="net-cost-row">
                                        <span className="net-cost-label">Left side</span>
                                        <span className="kpi-value neutral" style={{ fontSize: '1rem', lineHeight: 1.4 }}>
                                            {currentLap && lastLeftTireChange ? lapsSinceLeftTireChange : '—'}
                                        </span>
                                    </div>
                                    <div className="net-cost-row">
                                        <span className="net-cost-label">Right side</span>
                                        <span className="kpi-value neutral" style={{ fontSize: '1rem', lineHeight: 1.4 }}>
                                            {currentLap && lastRightTireChange ? lapsSinceRightTireChange : '—'}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p className="kpi-meta">Select a driver to view tire-change timing</p>
                            )}

                            <p className="kpi-label" style={{ marginTop: 12 }}>Net Pit Cost</p>
                            {selectedDriver ? (
                                filteredPitStops.map((stop, index) => (
                                    <div key={index} className="net-cost-row">
                                        <span className="net-cost-label">Stop {index + 1}</span>
                                        <span className="kpi-value neutral" style={{ fontSize: '1rem', lineHeight: 1.4 }}>
                                            {roundToUp((stop.total_duration - stop.previous_lap_time) + (stop.next_lap_time - stop.previous_lap_time), 3)}s
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="kpi-meta">Select a driver to view stop cost</p>
                            )}
                        </div>
                    </div>
                </Grid>

                <Grid size={{ xs: 12, lg: 8 }}>
                    <div className="table-panel">
                        <div className="chart-header">
                            <p className="chart-title">Recent Pit Stops</p>
                        </div>
                        <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Car</th>
                                        <th>Driver</th>
                                        <th>Pit Lap</th>
                                        <th>Duration</th>
                                        <th>Position</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPitStops.map((stop) => {
                                        const statusClass =
                                            stop.pit_in_flag_status === 1
                                                ? 'status-green'
                                                : stop.pit_in_flag_status === 2
                                                  ? 'status-yellow'
                                                  : 'status-red';

                                        const statusLabel =
                                            stop.pit_in_flag_status === 1
                                                ? 'green'
                                                : stop.pit_in_flag_status === 2
                                                  ? 'caution'
                                                  : 'red';

                                        return (
                                            <tr key={`${stop.driver_name}-${stop.lap_count}-${stop.vehicle_number}`}>
                                                <td>{stop.vehicle_number}</td>
                                                <td>{stop.driver_name}</td>
                                                <td>{stop.lap_count}</td>
                                                <td>{stop.pit_stop_duration}s</td>
                                                <td>{stop.positions_gained_lost}</td>
                                                <td>{stop.pit_stop_type}</td>
                                                <td>
                                                    <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Grid>
            </Grid>
        </div>
    );
}
