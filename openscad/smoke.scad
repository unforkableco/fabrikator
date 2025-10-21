// Simple smoke test: cube and sphere union
union() {
  cube([20,20,20], center=true);
  translate([10,10,10]) sphere(r=8);
}
