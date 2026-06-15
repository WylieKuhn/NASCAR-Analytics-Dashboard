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

        getLapData();
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


    const stopDurations = filteredPitStops.length > 1 ?
        standardDeviation(filteredPitStops.map(stop => stop.pit_stop_duration)) : 0;

    return(
            <Grid container spacing={3} sx={{px:4, py:4, mx:"auto"}}>
                <Grid size={{xs:12}} sx={{display:"flex", justifyContent:'center'}}>
                    <Link to={"/table"}>
                        <Button variant="outlined">
                        Data Table
                        </Button>
                    </Link>
                </Grid>

                <Grid size={{xs:12, md: 4, lg:3}} sx={{boxShadow:3, p:2, borderRadius:5, display: "flex", flexDirection: "column", gap:2}}>

                    <Autocomplete
                        options={races} value={selectedRace} getOptionLabel={formatRaceName}
                        onChange={(_, race) => {setSelectedRace(race);}}
                        renderInput={(params) => (
                            <TextField {...params} label="Select Race" />
                        )}/>
                    <Button onClick={handlePitStopRequest} variant={"contained"}>Get Data</Button>
                    <Autocomplete
                        options={driverNames} value={selectedDriver}
                        onChange={(_, newValue) => {setSelectedDriver(newValue);}}
                        renderInput={(params) => (
                            <TextField {...params} label="Driver" />
                        )}/>
                    <FormControlLabel control={
                        <Checkbox checked={excludeOutliers} onChange={((_, checked) => setExcludeOutliers(checked))}/>
                    } label={"Exclude Outliers"}
                                      sx={{ width: '100%', mt: 1, display: 'flex', justifyContent: 'flex-start' }}
                    />

                </Grid>
                <Grid size={{xs:12, md:4, lg: 3}} sx={{display: "flex", px:2, flexDirection: "column", boxShadow:3, borderRadius: 5}}>
                    <Typography align="center" sx={{py:1, fontSize: 20, fontWeight:"bold"}}>Average Duration</Typography>
                    <Typography
                        align="center"
                        sx={{fontSize: 18, color:`${selectedDriver ? (avgPitStopTime < allDriverAvg ? 'green' : `red`) : `black`}`}}
                    >
                        {roundToUp(avgPitStopTime,3)}s
                    </Typography>
                    <Typography align="center" sx={{py:1, fontSize: 20, fontWeight:"bold" }}>
                        Fastest Stop
                    </Typography>
                    <Typography
                        align="center"
                        sx={{fontSize: 18,}}
                    >
                        {roundToUp(fastPitStopTime,3)}s
                    </Typography>
                    <Typography align="center" sx={{py:1, fontSize: 20, fontWeight:"bold"}}>Slowest Stop</Typography>
                    <Typography
                        align="center"
                        sx={{fontSize: 18,}}
                    >
                        {roundToUp(slowestPitStopTime,3)}s
                    </Typography>
                    <Typography align="center" sx={{py:1, fontSize: 20, fontWeight:"bold"}}> Last Pit Lap</Typography>
                    <Typography
                        align="center"
                        sx={{fontSize: 18,}}
                    >
                        {lastPitStop?.lap_count}
                    </Typography>
                </Grid>

                {/* Stats */}
                <Grid size={{xs:12, md:4, lg: 3}} sx={{display: "flex", px:2, flexDirection: "column", boxShadow:3, borderRadius: 5}}>
                    <Typography align="center" sx={{py:1, fontSize: 20, fontWeight:"bold" }}>
                        Standard Deviation
                    </Typography>
                    <Typography
                        align="center"
                        sx={{fontSize: 18,}}
                    >
                        {roundToUp(stopDurations, 3)}s
                    </Typography>
                    <Typography align="center" sx={{py:1, fontSize: 20, fontWeight:"bold"}}>Laps Since Tire Change</Typography>
                    <Typography
                        align="center"
                        sx={{fontSize: 18,}}
                    >
                        Coming Soon
                    </Typography>
                    <Typography align="center" sx={{py:1, fontSize: 20, fontWeight:"bold"}}>Other Data</Typography>
                    <Typography
                        align="center"
                        sx={{fontSize: 18,}}
                    >
                        Coming Soon
                    </Typography>



                </Grid>

                <Grid size={{xs: 12, md:4, lg:3}} sx={{p:2, display: "flex", flexDirection: "column", boxShadow:3, borderRadius: 5}}>
                    <Typography sx={{fontSize:20, fontWeight:"bold"}} align="center">Net Pit Cost</Typography>
                    {selectedDriver ? filteredPitStops.map((stop, index) => {
                        return(
                            <Typography sx={{fontSize:18}} key={index} align="center">Stop {index+1}: {roundToUp((stop.total_duration - stop.previous_lap_time) + (stop.next_lap_time - stop.previous_lap_time), 3) + 's'}
                            </Typography>


                        )}) : "N/A"}

                </Grid>

                <Grid size={{xs: 12, md:12, lg:6}} sx={{display: "flex", flexDirection: "column", boxShadow:3, borderRadius: 5}}>
                    <ScatterChart
                        height={300}
                        width={400}
                        series={[
                            {
                                label: selectedDriver ?? "All Drivers",
                                data: gainedLostChartData,

                            }]}
                        xAxis={[{ label: "Pit Stop Duration (s)" }]}
                        yAxis={[{ label: "Positions Gained/Lost" }]}

                    />
                </Grid>

                <Grid size={{xs: 12, md:12, lg:6}} sx={{display: "flex", flexDirection: "column", boxShadow:3, borderRadius: 5}}>
                <LineChart
                    height={300}
                    width={400}
                    series={[
                        {
                            data: runningPositionDeltaData.map(posdata => posdata.delta),
                            label: "Position Delta Since Last Pit Stop",
                            curve: "linear"

                        }]}
                    xAxis={[
                        {
                            data: runningPositionDeltaData.map(d => d.lap),
                            label: "Lap"
                        }
                    ]}

                />
                </Grid>

            </Grid>



    )
}
