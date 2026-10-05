import {Autocomplete, Button, Checkbox, FormControlLabel, TextField} from "@mui/material";
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {cumulativeStdNormalProbability, standardDeviation, zScore} from "simple-statistics";
import {roundToUp} from "round-to";



export default function AddItem() {


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
                console.log(data.series_1)

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

    const driverNames = [
    ...new Set(pitStops.map((stop) => stop.driver_name))
    ].sort();

    function formatRaceName(race: Race): string {
        const date = new Date(race.race_date);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        return `${month}/${day} - ${race.track_name}`;
    }

    const filteredPitStops = excludeOutliers ?
        pitStops.filter((stop) => stop.pit_stop_duration !== -1 && (
            !selectedDriver || stop.driver_name == selectedDriver) && stop.pit_stop_duration <= 40) :
        pitStops.filter((stop) => stop.pit_stop_duration !== -1 && (!selectedDriver || stop.driver_name == selectedDriver));

    const stopStdDev =
        pitStops.length > 1
            ? standardDeviation(
                (excludeOutliers
                        ? pitStops.filter(
                            stop =>
                                stop.pit_stop_duration !== -1 &&
                                stop.pit_stop_duration <= 40
                        )
                        : pitStops.filter(
                            stop => stop.pit_stop_duration !== -1
                        )
                ).map(stop => stop.pit_stop_duration)
            )
            : 1;

    const avgStopTime =
        pitStops.length > 0
            ? (
                  (
                      excludeOutliers
                          ? pitStops.filter(
                                (stop) => stop.pit_stop_duration !== -1 && stop.pit_stop_duration <= 40
                            )
                          : pitStops.filter((stop) => stop.pit_stop_duration !== -1)
                  ).reduce((sum, stop) => sum + stop.pit_stop_duration, 0) /
                  (
                      excludeOutliers
                          ? pitStops.filter(
                                (stop) => stop.pit_stop_duration !== -1 && stop.pit_stop_duration <= 40
                            )
                          : pitStops.filter((stop) => stop.pit_stop_duration !== -1)
                  ).length
              )
            : 0;

    return (
        <div className="dashboard-shell">
            <header className="page-header">
                <div>
                    <span className="eyebrow">NASCAR analytics</span>
                    <h1>Pit Stop Data Table</h1>
                </div>
                <div className="header-actions">
                    <Link to="/" className="nav-link">
                        <Button variant="outlined" className="secondary-btn">
                            Analytics
                        </Button>
                    </Link>
                </div>
            </header>

            <div className="filters-panel">
                <div className="filter-grid">
                    <Button onClick={handlePitStopRequest} variant="contained" className="primary-btn" sx={{ height: '56px' }}>
                        Get Data
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

            <div className="table-panel">
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Number</th>
                                <th>Name</th>
                                <th>Pit In Lap</th>
                                <th>Pit Stop Duration</th>
                                <th>Positions Gained/Lost</th>
                                <th>Pit Stop Type</th>
                                <th>Z-Score</th>
                                <th>Top %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPitStops.map((stop) => {
                                const zValue = zScore(stop.pit_stop_duration, avgStopTime, stopStdDev);
                                const statusClass =
                                    stop.pit_in_flag_status === 1
                                        ? 'status-green'
                                        : stop.pit_in_flag_status === 2
                                          ? 'status-yellow'
                                          : 'status-red';

                                return (
                                    <tr key={`${stop.driver_name}-${stop.lap_count}-${stop.vehicle_number}`}>
                                        <td>{stop.vehicle_number}</td>
                                        <td>{stop.driver_name}</td>
                                        <td>{stop.lap_count}</td>
                                        <td>{stop.pit_stop_duration}s</td>
                                        <td>{stop.positions_gained_lost}</td>
                                        <td>
                                            <span className={`status-pill ${statusClass}`}>{stop.pit_stop_type}</span>
                                        </td>
                                        <td>{roundToUp(zValue, 6)}</td>
                                        <td>{roundToUp(cumulativeStdNormalProbability(zValue) * 100, 2)}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
